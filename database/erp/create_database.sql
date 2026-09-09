\set ON_ERROR_STOP on
SELECT 'CREATE DATABASE erp_db' WHERE NOT EXISTS(SELECT FROM pg_database WHERE datname='erp_db') \gexec
