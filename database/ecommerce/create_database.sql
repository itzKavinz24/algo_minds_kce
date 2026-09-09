\set ON_ERROR_STOP on
-- Optional, run while connected to postgres, outside a transaction.
-- Does nothing when ecommerce_db already exists. Never creates other databases.
SELECT 'CREATE DATABASE ecommerce_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='ecommerce_db')
\gexec
