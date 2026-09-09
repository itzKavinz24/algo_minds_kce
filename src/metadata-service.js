import { AppError } from './errors.js';

function splitTableName(value) {
  const parts = value.split('.');
  if (parts.length === 1) return { schema: null, table: parts[0] };
  if (parts.length === 2) return { schema: parts[0], table: parts[1] };
  throw new AppError('INVALID_TABLE', 'Table must be table or schema.table');
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function parseCheckConstraintValues(checkConstraints) {
  if (!Array.isArray(checkConstraints) || checkConstraints.length === 0) return null;
  for (const constraint of checkConstraints) {
    if (typeof constraint !== 'string') continue;
    // Match: = ANY (ARRAY['val1'::text, 'val2'::text, ...])
    const arrayMatch = constraint.match(/=\s*ANY\s*\(\s*ARRAY\[([\s\S]*?)\]\s*\)/i);
    if (arrayMatch) {
      const values = [];
      const itemRegex = /'([^']*)'(?:::text)?/g;
      let m;
      while ((m = itemRegex.exec(arrayMatch[1])) !== null) {
        values.push(m[1]);
      }
      if (values.length > 0) return values;
    }

    // Match: IN ('val1', 'val2', ...)
    const inMatch = constraint.match(/\bIN\s*\(\s*([\s\S]*?)\s*\)/i);
    if (inMatch) {
      const values = [];
      const itemRegex = /'([^']*)'/g;
      let m;
      while ((m = itemRegex.exec(inMatch[1])) !== null) {
        values.push(m[1]);
      }
      if (values.length > 0) return values;
    }
  }
  return null;
}

export class MetadataService {
  constructor(registry, settings = {}) {
    this.registry = registry;
    this.maxDistinctValues = settings.metadataMaxDistinctValues ?? 20;
    this.scanRowLimit = settings.metadataScanRowLimit ?? 50000;
    this.metadataTimeoutMs = settings.metadataTimeoutMs ?? 1000;
  }

  async listTables(sourceId) {
    const source = this.registry.source(sourceId);
    const result = await this.registry.pool(sourceId).query({
      text: `SELECT t.table_schema AS schema, t.table_name AS name,
                    obj_description((quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))::regclass, 'pg_class') AS description
             FROM information_schema.tables t
             WHERE t.table_type = 'BASE TABLE' AND t.table_schema = ANY($1::text[])
             ORDER BY t.table_schema, t.table_name`,
      values: [source.schemas]
    });
    return result.rows;
  }

  async resolveTable(sourceId, input) {
    const source = this.registry.source(sourceId);
    const { schema, table } = splitTableName(input);
    const candidates = await this.registry.pool(sourceId).query({
      text: `SELECT table_schema AS schema, table_name AS name
             FROM information_schema.tables
             WHERE table_type='BASE TABLE' AND table_schema=ANY($1::text[])
               AND table_name=$2 AND ($3::text IS NULL OR table_schema=$3)`,
      values: [source.schemas, table, schema]
    });
    if (candidates.rowCount === 0) throw new AppError('UNKNOWN_TABLE', `Unknown table: ${input}`);
    if (candidates.rowCount > 1) throw new AppError('AMBIGUOUS_TABLE', `Qualify table with its schema: ${input}`);
    return candidates.rows[0];
  }

  async describeTable(sourceId, input) {
    const target = await this.resolveTable(sourceId, input);
    const [columns, primaryKey, foreignKeys] = await Promise.all([
      this.registry.pool(sourceId).query({
        text: `SELECT c.ordinal_position, c.column_name AS name, c.data_type,
                      c.udt_name, format_type(a.atttypid,a.atttypmod) AS formatted_data_type,
                      c.is_nullable='YES' AS nullable, c.column_default,
                      c.is_identity='YES' AS identity,
                      col_description(rel.oid,a.attnum) AS description,
                      greatest(rel.reltuples, 0)::bigint AS estimated_rows,
                      CASE WHEN typ.typtype='e' THEN
                        (SELECT json_agg(e.enumlabel ORDER BY e.enumsortorder)
                         FROM pg_enum e WHERE e.enumtypid=typ.oid)
                      END AS enum_values,
                      ARRAY(SELECT pg_get_constraintdef(chk.oid, true)
                            FROM pg_constraint chk
                            WHERE chk.conrelid=rel.oid AND chk.contype='c'
                              AND a.attnum=ANY(chk.conkey)
                            ORDER BY chk.conname) AS check_constraints
               FROM information_schema.columns c
               JOIN pg_namespace n ON n.nspname=c.table_schema
               JOIN pg_class rel ON rel.relnamespace=n.oid AND rel.relname=c.table_name
               JOIN pg_attribute a ON a.attrelid=rel.oid AND a.attname=c.column_name AND a.attnum>0
               JOIN pg_type typ ON typ.oid=a.atttypid
               WHERE c.table_schema=$1 AND c.table_name=$2 ORDER BY c.ordinal_position`,
        values: [target.schema, target.name]
      }),
      this.registry.pool(sourceId).query({
        text: `SELECT a.attname AS column
               FROM pg_constraint con
               JOIN pg_class rel ON rel.oid=con.conrelid
               JOIN pg_namespace n ON n.oid=rel.relnamespace
               JOIN unnest(con.conkey) WITH ORDINALITY k(attnum, ord) ON true
               JOIN pg_attribute a ON a.attrelid=rel.oid AND a.attnum=k.attnum
               WHERE con.contype='p' AND n.nspname=$1 AND rel.relname=$2 ORDER BY k.ord`,
        values: [target.schema, target.name]
      }),
      this.#foreignKeys(sourceId, target.schema, target.name)
    ]);
    const primaryKeyColumns = primaryKey.rows.map((r) => r.column);
    const foreignKeyColumns = new Set(foreignKeys.flatMap((fk) => fk.source.columns));
    const enrichedColumns = await this.#addValueDomains(
      sourceId, target, columns.rows, primaryKeyColumns, foreignKeyColumns
    );
    return {
      schema: target.schema,
      name: target.name,
      primaryKey: primaryKeyColumns,
      columns: enrichedColumns,
      foreignKeys
    };
  }

  async #addValueDomains(sourceId, target, columns, primaryKeyColumns, foreignKeyColumns) {
    const source = this.registry.source(sourceId);
    const approved = new Set(source.domainColumns ?? []);
    const estimatedRows = Number(columns[0]?.estimated_rows ?? 0);
    const output = columns.map(({ enum_values: enumValues, estimated_rows: _estimatedRows, ...column }) => {
      const declaredCheckValues = parseCheckConstraintValues(column.check_constraints);
      const enriched = {
        ...column,
        column: column.name,
        type: column.formatted_data_type || column.data_type,
        semanticMeaning: column.description ?? null,
        semantic_type: null,
        values: null
      };
      if (Array.isArray(enumValues)) {
        enriched.valueDomain = {
          source: 'postgresql_enum', values: enumValues, complete: true
        };
      }
      enriched._declaredCheckValues = declaredCheckValues;
      return enriched;
    });

    if (estimatedRows <= this.scanRowLimit) {
      const eligible = output.filter((column) =>
        !column.valueDomain &&
        approved.has(`${target.schema}.${target.name}.${column.name}`) &&
        !primaryKeyColumns.includes(column.name) &&
        !foreignKeyColumns.has(column.name)
      );

      if (eligible.length > 0) {
        const client = await this.registry.pool(sourceId).connect();
        try {
          await client.query('BEGIN TRANSACTION READ ONLY');
          await client.query(`SET LOCAL statement_timeout = ${this.metadataTimeoutMs}`);
          for (const column of eligible) {
            const result = await client.query({
              text: `SELECT DISTINCT ${quoteIdentifier(column.name)}::text AS value
                     FROM ${quoteIdentifier(target.schema)}.${quoteIdentifier(target.name)}
                     WHERE ${quoteIdentifier(column.name)} IS NOT NULL
                     ORDER BY value
                     LIMIT $1`,
              values: [this.maxDistinctValues + 1]
            });
            const truncated = result.rows.length > this.maxDistinctValues;
            column.valueDomain = {
              source: 'observed_data',
              values: result.rows.slice(0, this.maxDistinctValues).map((row) => row.value),
              completeForCurrentData: !truncated,
              truncated,
              maxValues: this.maxDistinctValues,
              note: 'Observed values in current accessible rows; not a declared exhaustive domain.'
            };
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          this.registry.logger?.warn('metadata_domain_discovery_skipped', {
            source: source.id, schema: target.schema, table: target.name, reason: error.code ?? 'query_failed'
          });
        } finally {
          client.release();
        }
      }
    }

    for (const column of output) {
      if (!column.valueDomain && column._declaredCheckValues) {
        column.valueDomain = {
          source: 'check_constraint',
          values: column._declaredCheckValues,
          complete: true,
          note: 'Declared in table check constraint.'
        };
      }

      const activeValues = column.valueDomain?.values ?? column._declaredCheckValues ?? null;
      if (Array.isArray(activeValues) && activeValues.length > 0) {
        column.values = activeValues;
        const isExhaustive = column.valueDomain?.source === 'postgresql_enum' ||
                             column.valueDomain?.source === 'check_constraint' ||
                             Boolean(column._declaredCheckValues);
        column.semantic_type = isExhaustive ? 'enum' : 'categorical';
      } else {
        column.values = null;
        column.semantic_type = null;
      }
      delete column._declaredCheckValues;
    }

    return output;
  }

  async getRelationships(sourceId) {
    const source = this.registry.source(sourceId);
    return this.#foreignKeys(sourceId, null, null, source.schemas);
  }

  async #foreignKeys(sourceId, schema, table, schemas) {
    const allowed = schemas ?? [schema];
    const result = await this.registry.pool(sourceId).query({
      text: `SELECT con.conname AS constraint_name,
                    ns.nspname AS source_schema, src.relname AS source_table,
                    sa.attname AS source_column,
                    nt.nspname AS target_schema, tgt.relname AS target_table,
                    ta.attname AS target_column,
                    k.ord AS column_position,
                    CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_update,
                    CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_delete
             FROM pg_constraint con
             JOIN pg_class src ON src.oid=con.conrelid JOIN pg_namespace ns ON ns.oid=src.relnamespace
             JOIN pg_class tgt ON tgt.oid=con.confrelid JOIN pg_namespace nt ON nt.oid=tgt.relnamespace
             JOIN unnest(con.conkey,con.confkey) WITH ORDINALITY k(srcnum,tgtnum,ord) ON true
             JOIN pg_attribute sa ON sa.attrelid=src.oid AND sa.attnum=k.srcnum
             JOIN pg_attribute ta ON ta.attrelid=tgt.oid AND ta.attnum=k.tgtnum
             WHERE con.contype='f' AND ns.nspname=ANY($1::text[])
               AND ($2::text IS NULL OR ns.nspname=$2) AND ($3::text IS NULL OR src.relname=$3)
             ORDER BY ns.nspname,src.relname,con.conname,k.ord`,
      values: [allowed, schema, table]
    });
    const grouped = new Map();
    for (const row of result.rows) {
      const key = `${row.source_schema}.${row.source_table}.${row.constraint_name}`;
      if (!grouped.has(key)) grouped.set(key, {
        constraintName: row.constraint_name,
        source: { schema: row.source_schema, table: row.source_table, columns: [] },
        target: { schema: row.target_schema, table: row.target_table, columns: [] },
        onUpdate: row.on_update, onDelete: row.on_delete
      });
      grouped.get(key).source.columns.push(row.source_column);
      grouped.get(key).target.columns.push(row.target_column);
    }
    return [...grouped.values()];
  }
}
