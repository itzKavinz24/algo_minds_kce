\set ON_ERROR_STOP on
SELECT 'CREATE DATABASE crm_db' WHERE NOT EXISTS(SELECT FROM pg_database WHERE datname='crm_db') \gexec
