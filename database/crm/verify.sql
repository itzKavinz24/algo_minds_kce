\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT relname table_name,n_live_tup estimated_rows FROM pg_stat_user_tables ORDER BY relname;
SELECT count(*) orphan_opportunities FROM opportunities o LEFT JOIN customers c USING(customer_id) WHERE c.customer_id IS NULL;
SELECT lead_status,count(*) FROM leads GROUP BY 1 ORDER BY 1;
SELECT opportunity_stage,count(*),sum(estimated_value) pipeline_value FROM opportunities GROUP BY 1 ORDER BY 1;
SELECT industry,count(*) customers FROM customers GROUP BY 1 ORDER BY 2 DESC;
COMMIT;
