\set ON_ERROR_STOP on
SELECT 'CREATE DATABASE hrms_db' WHERE NOT EXISTS(SELECT FROM pg_database WHERE datname='hrms_db') \gexec
