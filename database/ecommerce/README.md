# Existing ecommerce_db seed

The live database was inspected before this seed was written. Its actual columns are:

- `customers(id,name,email,city,created_at)`
- `products(id,name,category,price)`
- `orders(id,customer_id,order_date,status)`
- `order_items(id,order_id,product_id,quantity,unit_price)`
- `payments(id,order_id,payment_date,amount,payment_method,status)`

At inspection time it contained 10 customers, 12 products, and zero orders, order items, and payments. The schema and tables are not recreated by the seed.

Run from the repository root with an account that has INSERT/DELETE permission on these tables. `analytics_readonly` intentionally cannot seed data:

```powershell
psql -X -h localhost -p 5432 -U postgres -d ecommerce_db -f database/ecommerce/seed.sql
```

The script prompts through your local PostgreSQL authentication as needed. It does not contain credentials.

The seed adds 170 controlled synthetic customers and 88 controlled products while preserving existing rows. It creates 378 orders across the prior 12 months and current month, 844 items, and 353 captured payments under the default reporting date. Live totals should therefore be about 180 customers and 100 products, subject to any other rows already present.

Reruns update controlled customers, avoid duplicate controlled products, and rebuild only orders belonging to emails matching `av-demo-customer-%@example.invalid`. It resolves customer/product relationships through natural values and captures every generated order ID using `INSERT ... RETURNING`; it never assumes sequence values.

Verify counts and integrity:

```powershell
psql -X -h localhost -p 5432 -U postgres -d ecommerce_db -f database/ecommerce/03_verify.sql
```

Or run individual counts:

```sql
SELECT COUNT(*) FROM public.customers;
SELECT COUNT(*) FROM public.products;
SELECT COUNT(*) FROM public.orders;
SELECT COUNT(*) FROM public.order_items;
SELECT COUNT(*) FROM public.payments;
```

Monthly revenue:

```sql
SELECT date_trunc('month',o.order_date)::date AS month,
       count(DISTINCT o.id) AS completed_orders,
       sum(i.quantity*i.unit_price) AS revenue
FROM public.orders o
JOIN public.order_items i ON i.order_id=o.id
WHERE o.status='completed'
GROUP BY 1
ORDER BY 1;
```

Run all trend, category, current-month, category-change and city-change queries with:

```powershell
psql -X -h localhost -p 5432 -U postgres -d ecommerce_db -f database/ecommerce/04_analytics.sql
```

The current month has fewer orders and no controlled Electronics sales or Chennai buyers. No reason column is stored; the category and city comparison queries expose the evidence. Because the current month may be partial, interpret month-over-month totals with the elapsed-day context.
