\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT current_database(), current_user, version();
DO $$ BEGIN
 IF current_database() <> 'ecommerce_db' THEN RAISE EXCEPTION 'Connect to ecommerce_db'; END IF;
END $$;
SELECT table_schema, table_name, column_name, data_type, is_nullable,
       column_default, is_identity
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, ordinal_position;
SELECT n.nspname, c.relname, con.conname, pg_get_constraintdef(con.oid) AS definition,
       con.convalidated
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1,2,3;
SELECT schemaname, tablename, indexdef FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
-- Dynamic SQL tolerates missing tables and nonstandard customer column names.
SELECT format('SELECT %L AS relation, count(*) AS rows FROM %I.%I;',
 table_schema || '.' || table_name, table_schema, table_name)
FROM information_schema.tables WHERE table_type = 'BASE TABLE'
AND table_name IN ('customers','products','orders','order_items','payments')
AND table_schema NOT IN ('pg_catalog','information_schema')
\gexec
-- IDs only: no customer names, emails, or phone numbers in inspection output.
SELECT format('SELECT %I FROM %I.%I ORDER BY %I LIMIT 20;',
 column_name, table_schema, table_name, column_name)
FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'id'
\gexec
COMMIT;
