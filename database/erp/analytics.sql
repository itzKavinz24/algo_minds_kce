SELECT w.warehouse_name,round(sum(i.available_quantity*p.cost_price),2) inventory_value FROM inventory i JOIN products p USING(product_id) JOIN warehouses w USING(warehouse_id) GROUP BY 1 ORDER BY 2 DESC;
SELECT p.product_code,p.product_name,w.warehouse_name,i.available_quantity,i.reorder_level FROM inventory i JOIN products p USING(product_id) JOIN warehouses w USING(warehouse_id) WHERE i.available_quantity<=i.reorder_level ORDER BY i.available_quantity;
SELECT date_trunc('month',order_date)::date month,round(sum(total_amount),2) revenue FROM sales_orders WHERE order_status<>'Cancelled' GROUP BY 1 ORDER BY 1;
SELECT payment_status,round(sum(outstanding_amount),2) outstanding FROM invoices GROUP BY 1 ORDER BY 1;
