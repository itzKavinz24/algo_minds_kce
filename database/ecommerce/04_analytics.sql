\set ON_ERROR_STOP on
WITH months AS (
 SELECT generate_series(date_trunc('month',current_date)-interval '12 months',
 date_trunc('month',current_date),interval '1 month')::date AS month
), sales AS (
 SELECT date_trunc('month',o.order_date)::date AS sales_month,count(DISTINCT o.id) AS orders,
 sum(i.quantity*i.unit_price) AS revenue FROM public.orders o
 JOIN public.order_items i ON i.order_id=o.id WHERE o.status='completed' GROUP BY 1
)
SELECT m.month,coalesce(s.orders,0) AS orders,coalesce(s.revenue,0) AS revenue
FROM months m LEFT JOIN sales s ON s.sales_month=m.month ORDER BY m.month;

SELECT p.category,sum(i.quantity*i.unit_price) revenue
FROM public.orders o JOIN public.order_items i ON i.order_id=o.id
JOIN public.products p ON p.id=i.product_id WHERE o.status='completed'
GROUP BY p.category ORDER BY revenue DESC;

SELECT coalesce(sum(i.quantity*i.unit_price),0) current_month_revenue
FROM public.orders o JOIN public.order_items i ON i.order_id=o.id
WHERE o.status='completed' AND o.order_date>=date_trunc('month',current_date)::date;

WITH category_comparison AS (SELECT p.category,
 count(DISTINCT o.id) FILTER (WHERE o.order_date<date_trunc('month',current_date)) previous_orders,
 count(DISTINCT o.id) FILTER (WHERE o.order_date>=date_trunc('month',current_date)) current_orders,
 coalesce(sum(i.quantity*i.unit_price) FILTER (WHERE o.order_date<date_trunc('month',current_date)),0) previous_revenue,
 coalesce(sum(i.quantity*i.unit_price) FILTER (WHERE o.order_date>=date_trunc('month',current_date)),0) current_revenue
FROM public.orders o JOIN public.order_items i ON i.order_id=o.id
JOIN public.products p ON p.id=i.product_id
WHERE o.status='completed' AND o.order_date>=date_trunc('month',current_date)-interval '1 month'
GROUP BY p.category)
SELECT *,current_revenue-previous_revenue AS revenue_change
FROM category_comparison ORDER BY revenue_change;

WITH city_comparison AS (SELECT c.city,
 coalesce(sum(i.quantity*i.unit_price) FILTER (WHERE o.order_date<date_trunc('month',current_date)),0) previous_revenue,
 coalesce(sum(i.quantity*i.unit_price) FILTER (WHERE o.order_date>=date_trunc('month',current_date)),0) current_revenue
FROM public.orders o JOIN public.customers c ON c.id=o.customer_id
JOIN public.order_items i ON i.order_id=o.id
WHERE o.status='completed' AND o.order_date>=date_trunc('month',current_date)-interval '1 month'
GROUP BY c.city)
SELECT *,current_revenue-previous_revenue AS revenue_change
FROM city_comparison ORDER BY revenue_change;
