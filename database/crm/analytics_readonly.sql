\set ON_ERROR_STOP on
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='analytics_readonly') THEN CREATE ROLE analytics_readonly LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS; END IF; END $$;
ALTER ROLE analytics_readonly SET default_transaction_read_only=on;
ALTER ROLE analytics_readonly SET statement_timeout='5s';
GRANT CONNECT ON DATABASE crm_db TO analytics_readonly;
GRANT USAGE ON SCHEMA public TO analytics_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_readonly;
