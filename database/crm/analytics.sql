SELECT round(100.0*count(*) FILTER(WHERE lead_status='Converted')/count(*),2) lead_conversion_percent FROM leads;
SELECT opportunity_stage,count(*) opportunities,round(sum(estimated_value),2) pipeline_value FROM opportunities GROUP BY 1 ORDER BY 1;
SELECT sr.name,count(*) FILTER(WHERE o.status='Won') won_deals,coalesce(sum(o.estimated_value) FILTER(WHERE o.status='Won'),0) won_value FROM sales_representatives sr LEFT JOIN opportunities o USING(sales_rep_id) GROUP BY sr.sales_rep_id ORDER BY won_value DESC;
