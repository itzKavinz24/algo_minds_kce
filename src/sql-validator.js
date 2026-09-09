import { parse } from 'pgsql-ast-parser';
import { AppError } from './errors.js';

const forbiddenNodeTypes = new Set([
  'insert', 'update', 'delete', 'merge', 'truncate', 'create table', 'create index',
  'create schema', 'create extension', 'create sequence', 'create view', 'create materialized view',
  'alter table', 'alter sequence', 'drop table', 'drop view', 'drop materialized view',
  'drop schema', 'drop sequence', 'drop index', 'grant', 'revoke', 'comment', 'vacuum',
  'set', 'show', 'prepare', 'execute', 'deallocate', 'transaction', 'commit', 'rollback',
  'copy', 'do', 'refresh materialized view'
]);

const blockedFunctions = new Set([
  'pg_sleep', 'pg_sleep_for', 'pg_sleep_until',
  'pg_advisory_lock', 'pg_advisory_xact_lock',
  'lo_import', 'lo_export', 'dblink_exec'
]);

function walk(value, visit, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  visit(value);
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit, seen));
  else Object.values(value).forEach((item) => walk(item, visit, seen));
}

export function validateReadQuery(sql, allowedSchemas = ['public']) {
  if (typeof sql !== 'string' || sql.trim() === '') {
    throw new AppError('INVALID_SQL', 'SQL must be a non-empty string');
  }
  if (sql.length > 100_000) throw new AppError('INVALID_SQL', 'SQL exceeds the 100000 character limit');

  let statements;
  try {
    statements = parse(sql);
  } catch (error) {
    throw new AppError('INVALID_SQL', `SQL could not be parsed: ${error.message}`);
  }
  if (statements.length !== 1) {
    throw new AppError('MULTIPLE_STATEMENTS', 'Exactly one SQL statement is allowed');
  }
  const readStatementTypes = new Set([
    'select', 'values', 'with',
    'union', 'union all', 'intersect', 'intersect all', 'except', 'except all'
  ]);
  if (!readStatementTypes.has(statements[0].type)) {
    throw new AppError('READ_ONLY_VIOLATION', `Statement type '${statements[0].type}' is not allowed`);
  }

  walk(statements[0], (node) => {
    // pgsql-ast-parser uses `call` for ordinary function expressions such as
    // COUNT(*) and date_trunc(...). A SQL CALL statement is still rejected by
    // the top-level statement allowlist above.
    if (typeof node.type === 'string' && forbiddenNodeTypes.has(node.type.toLowerCase())) {
      throw new AppError('READ_ONLY_VIOLATION', `SQL operation '${node.type}' is not allowed`);
    }
    if (node.type === 'select' && node.into) {
      throw new AppError('READ_ONLY_VIOLATION', 'SELECT INTO is not allowed');
    }
    if (node.type === 'call' && node.function?.name) {
      const name = String(node.function.name).toLowerCase();
      if (blockedFunctions.has(name)) {
        throw new AppError('READ_ONLY_VIOLATION', `Function '${name}' is not allowed`);
      }
    }
    if (node.type === 'table' && node.name && typeof node.name === 'object') {
      const schema = node.name.schema;
      if (schema && !allowedSchemas.includes(schema)) {
        throw new AppError('SCHEMA_NOT_ALLOWED', `Schema '${schema}' is not allowed for this source`);
      }
    }
  });

  return sql.trim().replace(/;\s*$/, '');
}
