\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT relname table_name,n_live_tup estimated_rows FROM pg_stat_user_tables ORDER BY relname;
SELECT count(*) orphan_sales_items FROM sales_order_items i LEFT JOIN sales_orders o USING(sales_order_id) WHERE o.sales_order_id IS NULL;
SELECT round(sum(i.available_quantity*p.cost_price),2) inventory_value FROM inventory i JOIN products p USING(product_id);
SELECT count(*) low_stock_records FROM inventory WHERE available_quantity<=reorder_level;
SELECT date_trunc('month',order_date)::date month,round(sum(total_amount),2) sales FROM sales_orders WHERE order_status<>'Cancelled' GROUP BY 1 ORDER BY 1;
SELECT round(sum(outstanding_amount),2) outstanding_invoice_amount FROM invoices;
COMMIT;
