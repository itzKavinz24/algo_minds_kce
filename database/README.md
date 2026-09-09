# Enterprise database initialization

Each data source remains a separate PostgreSQL database. The folders use the same SQL-first pattern as `ecommerce`: `create_database.sql`, `schema.sql`, `seed.sql`, `verify.sql`, `analytics.sql`, and least-privilege grants.

Run these commands from the repository root with a PostgreSQL administrator. Passwords are supplied by your local PostgreSQL authentication and never stored in these files.

```powershell
psql -X -h localhost -U postgres -d postgres -f database/hrms/create_database.sql
psql -X -h localhost -U postgres -d hrms_db -f database/hrms/schema.sql
psql -X -h localhost -U postgres -d hrms_db -f database/hrms/seed.sql
psql -X -h localhost -U postgres -d hrms_db -f database/hrms/analytics_readonly.sql
psql -X -h localhost -U postgres -d hrms_db -f database/hrms/verify.sql

psql -X -h localhost -U postgres -d postgres -f database/crm/create_database.sql
psql -X -h localhost -U postgres -d crm_db -f database/crm/schema.sql
psql -X -h localhost -U postgres -d crm_db -f database/crm/seed.sql
psql -X -h localhost -U postgres -d crm_db -f database/crm/analytics_readonly.sql
psql -X -h localhost -U postgres -d crm_db -f database/crm/verify.sql

psql -X -h localhost -U postgres -d postgres -f database/erp/create_database.sql
psql -X -h localhost -U postgres -d erp_db -f database/erp/schema.sql
psql -X -h localhost -U postgres -d erp_db -f database/erp/seed.sql
psql -X -h localhost -U postgres -d erp_db -f database/erp/analytics_readonly.sql
psql -X -h localhost -U postgres -d erp_db -f database/erp/verify.sql
```

The seed scripts rebuild only their respective synthetic database contents inside a transaction. They are deterministic relative to `current_date`, safe to rerun, and do not touch `ecommerce_db`.
