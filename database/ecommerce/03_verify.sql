\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT 'customers' AS table_name,count(*) AS row_count FROM public.customers
UNION ALL SELECT 'products',count(*) FROM public.products
UNION ALL SELECT 'orders',count(*) FROM public.orders
UNION ALL SELECT 'order_items',count(*) FROM public.order_items
UNION ALL SELECT 'payments',count(*) FROM public.payments;

SELECT 'orders.customer_id' AS relationship,count(*) AS orphan_count
FROM public.orders o LEFT JOIN public.customers c ON c.id=o.customer_id WHERE c.id IS NULL
UNION ALL SELECT 'order_items.order_id',count(*) FROM public.order_items i
LEFT JOIN public.orders o ON o.id=i.order_id WHERE o.id IS NULL
UNION ALL SELECT 'order_items.product_id',count(*) FROM public.order_items i
LEFT JOIN public.products p ON p.id=i.product_id WHERE p.id IS NULL
UNION ALL SELECT 'payments.order_id',count(*) FROM public.payments p
LEFT JOIN public.orders o ON o.id=p.order_id WHERE o.id IS NULL;

-- Expect zero rows.
WITH lines AS (SELECT order_id,sum(quantity*unit_price) amount FROM public.order_items GROUP BY order_id),
payments AS (SELECT order_id,sum(amount) amount FROM public.payments WHERE status='captured' GROUP BY order_id)
SELECT o.id,l.amount AS line_amount,p.amount AS payment_amount
FROM public.orders o LEFT JOIN lines l ON l.order_id=o.id LEFT JOIN payments p ON p.order_id=o.id
WHERE o.status='completed' AND l.amount IS DISTINCT FROM p.amount;
COMMIT;
