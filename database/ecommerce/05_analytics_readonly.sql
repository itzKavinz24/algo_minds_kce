\set ON_ERROR_STOP on
-- Run as a PostgreSQL administrator. Set the password separately through your
-- credential-management process; this file never stores one.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'analytics_readonly') THEN
    CREATE ROLE analytics_readonly LOGIN
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;
ALTER ROLE analytics_readonly
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE analytics_readonly SET default_transaction_read_only = on;
ALTER ROLE analytics_readonly SET statement_timeout = '5s';
ALTER ROLE analytics_readonly SET lock_timeout = '2s';
GRANT CONNECT ON DATABASE ecommerce_db TO analytics_readonly;
GRANT USAGE ON SCHEMA public TO analytics_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;
-- Run by the role that will create future tables, or replace CURRENT_USER with
-- the actual owner, so future tables are discoverable without manual grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO analytics_readonly;
