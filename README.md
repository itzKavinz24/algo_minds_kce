# Enterprise Data MCP Server

A generic, read-only Model Context Protocol server for registered PostgreSQL data sources. It contains no E-Commerce, HRMS, CRM or ERP query logic. `ecommerce_db` is the first source registration in `config/sources.json`; later databases use another configuration entry and environment-variable prefix without changes to the five tool implementations.

The implementation is plain JavaScript (Node.js ESM). It uses the official MCP JavaScript SDK v2 with stdio and Streamable HTTP transports, `pg` connection pools, Zod tool inputs and `pgsql-ast-parser` for structural SQL checks.

## Layout

| Path | Responsibility |
|---|---|
| `config/sources.json` | Safe source registry: IDs, display names, allowed schemas and columns approved for bounded domain discovery; no credentials |
| `src/config.js` | Loads source registration and server-side environment settings |
| `src/source-registry.js` | Resolves sources and lazily creates isolated PostgreSQL pools |
| `src/metadata-service.js` | Dynamic tables, columns, types, PK and FK discovery |
| `src/sql-validator.js` | Single-statement parsed read-only SQL policy |
| `src/query-service.js` | PostgreSQL validation, read-only transaction, timeout and row cap |
| `src/server.js` | The five generic MCP tool contracts |
| `src/index.js` | Stdio entry point; stdout stays reserved for MCP JSON-RPC |
| `src/http.js` | Streamable HTTP entry point, Node HTTP bridge and health endpoint |
| `scripts/smoke-test.js` | Calls all five tools through a real MCP client/stdio connection |
| `scripts/http-smoke-test.js` | Calls all five tools through Streamable HTTP |
| `test/` | SQL-policy unit test and opt-in PostgreSQL integration test |

## Install and configure

Requires Node.js 20+ and PostgreSQL. Install dependencies from the repository root:

```powershell
npm install
Copy-Item .env.example .env
```

Set these server-side variables in `.env` or the process environment:

```dotenv
ECOMMERCE_DB_HOST=localhost
ECOMMERCE_DB_PORT=5432
ECOMMERCE_DB_NAME=ecommerce_db
ECOMMERCE_DB_USER=analytics_readonly
ECOMMERCE_DB_PASSWORD=set-locally
ECOMMERCE_DB_SSL=false
MCP_QUERY_MAX_ROWS=500
MCP_QUERY_TIMEOUT_MS=5000
MCP_METADATA_MAX_DISTINCT_VALUES=20
MCP_METADATA_SCAN_ROW_LIMIT=50000
MCP_METADATA_TIMEOUT_MS=1000
MCP_LOG_LEVEL=info
MCP_TRANSPORT=stdio
MCP_HOST=0.0.0.0
MCP_PORT=3000
```

`ECOMMERCE_DB_DATABASE_URL` may replace the six connection fields. `.env` is ignored by Git. Connection fields and passwords never appear in MCP tool results. Set `MCP_SOURCES_CONFIG` only when using a registry file outside the default location.

Optionally create the constrained database login as a PostgreSQL administrator, then set its password separately:

```powershell
psql -X -h localhost -U postgres -d ecommerce_db -f database/ecommerce/05_analytics_readonly.sql
psql -X -h localhost -U postgres -d ecommerce_db -c "\\password analytics_readonly"
```

The default-privileges statement affects tables subsequently created by the role running that script. If another owner creates tables, run the equivalent `ALTER DEFAULT PRIVILEGES FOR ROLE owner_name ...` as that owner or an administrator.

## Start and test

An stdio MCP server normally gets launched by its MCP host:

```powershell
npm start
```

For LAN access, set HTTP mode in `.env`:

```dotenv
MCP_TRANSPORT=http
MCP_HOST=0.0.0.0
MCP_PORT=3000
```

Then start the Streamable HTTP server through the main entry point:

```powershell
npm start
```

It listens on all interfaces by default. Remote MCP clients use:

```text
http://<server-lan-ip>:3000/mcp
```

The health endpoint is:

```text
http://<server-lan-ip>:3000/health
```

Find the Windows host's LAN address with `ipconfig`. From another machine, replace the example address and check connectivity:

```powershell
Invoke-RestMethod http://192.168.1.50:3000/health
```

If Windows Firewall blocks the connection, allow inbound TCP port 3000 for the Private network profile. The HTTP MVP has no application-level authentication or TLS, so expose it only on a trusted LAN. PostgreSQL credentials remain server-side and database queries still use the configured role and read-only controls.

The direct `npm run start:http` shortcut remains available. For local stdio mode, set `MCP_TRANSPORT=stdio` and run `npm start`.

Change the HTTP bind address or port through `.env`:

```dotenv
MCP_TRANSPORT=http
MCP_HOST=0.0.0.0
MCP_PORT=3000
```

For interactive testing with MCP Inspector:

```powershell
npm run inspect
```

Use the Tools tab with these arguments:

| Tool | Arguments |
|---|---|
| `list_sources` | `{}` |
| `list_tables` | `{"source":"ecommerce_db"}` |
| `describe_table` | `{"source":"ecommerce_db","table":"public.orders"}` |
| `get_relationships` | `{"source":"ecommerce_db"}` |
| `execute_read_query` | `{"source":"ecommerce_db","sql":"SELECT category, count(*) FROM products GROUP BY category"}` |

Run all five through the included SDK client:

```powershell
npm run smoke
npm run smoke:http
npm test
$env:TEST_DATABASE_URL='postgresql://analytics_readonly:local-password@localhost:5432/ecommerce_db'
npm run test:integration
```

Example response shapes for the seeded database are:

```json
{"sources":[{"id":"ecommerce_db","displayName":"E-Commerce PostgreSQL","engine":"postgresql","schemas":["public"]}]}
```

```json
{"source":"ecommerce_db","tables":[{"schema":"public","name":"customers"},{"schema":"public","name":"order_items"},{"schema":"public","name":"orders"},{"schema":"public","name":"payments"},{"schema":"public","name":"products"}]}
```

`describe_table` includes `schema`, `name`, ordered `columns`, `primaryKey`, and grouped `foreignKeys`. Each column includes its PostgreSQL type, nullability, default, identity flag, column comment as both `description` and `semanticMeaning`, applicable check constraints, and a value domain when one can be discovered safely. PostgreSQL enum labels are complete declared domains. Bounded distinct values are collected only for columns explicitly listed in the source's `domainColumns` configuration.

For the included E-Commerce registration, `public.payments.status` is approved for domain discovery. After applying `database/ecommerce/06_metadata_comments.sql`, an abbreviated response is:

```json
{
  "name": "status",
  "data_type": "character varying",
  "nullable": false,
  "description": "Payment processing state. captured means the payment was successfully captured. Payment status values are distinct from order status values.",
  "semanticMeaning": "Payment processing state. captured means the payment was successfully captured. Payment status values are distinct from order status values.",
  "check_constraints": [],
  "valueDomain": {
    "source": "observed_data",
    "values": ["captured"],
    "completeForCurrentData": true,
    "truncated": false,
    "maxValues": 20,
    "note": "Observed values in current accessible rows; not a declared exhaustive domain."
  }
}
```

Apply these comments without rebuilding or reseeding the existing database:

```powershell
node scripts/apply-ecommerce-metadata.js
```

When registering another database, add only low-cardinality, non-sensitive categorical columns to `domainColumns`, using `schema.table.column`. The three `MCP_METADATA_*` settings cap returned values, skip observed scans for tables whose PostgreSQL row estimate exceeds the configured limit, and apply a short statement timeout. Domain scans run in a read-only transaction and respect the source schema allowlist and database permissions.

Automatic metadata cannot infer every business rule. PostgreSQL comments provide curated semantic meaning, enums and check constraints provide declared restrictions, while observed values only describe rows visible to the configured role at that moment. Empty tables, stale PostgreSQL statistics, truncated domains, row-level security, and values that have not occurred yet can make an observed domain incomplete. Sensitive or high-cardinality columns should remain outside `domainColumns`.

`get_relationships` returns the four configured-by-PostgreSQL FK relationships. Query results contain `columns`, `rows`, `rowCount`, `truncated`, and `maxRows`. Exact IDs, counts, defaults and descriptions come from the connected database and are not embedded in the server.

Abbreviated examples for the remaining tools:

```json
{
  "source": "ecommerce_db",
  "table": {
    "schema": "public",
    "name": "orders",
    "primaryKey": ["id"],
    "columns": [
      {"name":"id","data_type":"bigint","formatted_data_type":"bigint","nullable":false,"identity":true},
      {"name":"customer_id","data_type":"bigint","formatted_data_type":"bigint","nullable":false,"identity":false}
    ],
    "foreignKeys": [{
      "constraintName":"fk_order_customer",
      "source":{"schema":"public","table":"orders","columns":["customer_id"]},
      "target":{"schema":"public","table":"customers","columns":["id"]},
      "onUpdate":"NO ACTION","onDelete":"NO ACTION"
    }]
  }
}
```

```json
{
  "source":"ecommerce_db",
  "relationships":[
    {"source":{"schema":"public","table":"orders","columns":["customer_id"]},"target":{"schema":"public","table":"customers","columns":["id"]}},
    {"source":{"schema":"public","table":"order_items","columns":["order_id"]},"target":{"schema":"public","table":"orders","columns":["id"]}},
    {"source":{"schema":"public","table":"order_items","columns":["product_id"]},"target":{"schema":"public","table":"products","columns":["id"]}},
    {"source":{"schema":"public","table":"payments","columns":["order_id"]},"target":{"schema":"public","table":"orders","columns":["id"]}}
  ]
}
```

```json
{
  "source":"ecommerce_db",
  "result":{"columns":[{"name":"category","dataTypeId":25},{"name":"count","dataTypeId":20}],"rows":[{"category":"Electronics","count":"20"}],"rowCount":1,"truncated":false,"maxRows":500}
}
```

These illustrate the response contract; table order, constraint names, type OIDs and values reflect the live database.

## Security model and limitations

`execute_read_query` accepts one parsed `SELECT`, set operation or `VALUES` statement. It rejects DML, DDL, transaction/control statements, data-changing CTEs, `SELECT INTO`, disallowed schemas and selected delay/advisory-lock functions. PostgreSQL then resolves real tables and columns with `EXPLAIN`, followed by execution inside `BEGIN TRANSACTION READ ONLY` with local statement, lock and idle-transaction timeouts. An outer query enforces the output cap even when user SQL has no `LIMIT`.

The parser is a policy layer, not the final security boundary. PostgreSQL privileges and the dedicated least-privilege role are required because user-defined functions can have side effects and SQL parser coverage can lag new PostgreSQL syntax. The timeout limits expensive queries but does not provide a full cost budget. The MVP supports PostgreSQL, stdio and Streamable HTTP, accepts no bind parameters, exposes base tables rather than views, and returns PostgreSQL type OIDs for result columns. Metadata validation is performed by PostgreSQL itself; inaccessible or unknown relations/columns return sanitized tool errors. Row-level security continues to apply according to the database role.

`hrms_db`, `crm_db`, and `erp_db` are registered in `config/sources.json`. Their complete schema, deterministic seed, verification, analytics, and read-only grant scripts are under `database/hrms`, `database/crm`, and `database/erp`. See `database/README.md` for individual commands, or initialize all three with `npm run db:init` using local administrator credentials. Define the matching `HRMS_DB_*`, `CRM_DB_*`, and `ERP_DB_*` server-side variables before querying them through MCP. No tool or agent code changes are needed.
