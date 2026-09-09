# XiYanSQL vs Groq NL-to-SQL Benchmark

## Executive summary

Groq is the recommended SQL-generation model for the current AgentVerse application. It scored **393/420 (93.6%)**, compared with **292/420 (69.5%)** for local XiYanSQL. XiYanSQL was substantially faster, but Groq was markedly better on order-level aggregation grain, multi-step comparisons, and reasoning-heavy SQL.

The benchmark used all 30 questions unchanged, the same live `ecommerce_db`, the same MCP tools, the same schema snapshot, temperature 0, and the existing SQL-agent JSON contract. Only validator-approved read-only SQL was sent to MCP.

Important environment finding: relationship metadata supplied to both models rendered as `. = .`. Both therefore had to infer joins from column names. The live database uses `orders.status = 'completed'` but `payments.status = 'captured'`.

## Overall results

| Metric | XiYanSQL | Groq |
|---|---:|---:|
| Score | **292/420** | **393/420** |
| Accuracy | **69.5%** | **93.6%** |
| SQL execution rate | 26/30 (86.7%) | 29/30 (96.7%) |
| Average end-to-end SQL attempt latency | 4.32 s | 13.56 s |
| Median latency | 4.25 s | 15.92 s |

## Category-wise accuracy

| Level | Maximum | XiYanSQL | Groq |
|---|---:|---:|---:|
| Basic retrieval | 70 | 68 (97.1%) | 70 (100.0%) |
| Filtering/aggregation | 98 | 82 (83.7%) | 98 (100.0%) |
| Multi-table reasoning | 84 | 61 (72.6%) | 83 (98.8%) |
| Business reasoning | 98 | 48 (49.0%) | 90 (91.8%) |
| Strong reasoning | 70 | 33 (47.1%) | 52 (74.3%) |

## Per-question comparison

`Correct` means at least 12/14; execution alone is not considered correctness.

| Q | Model A: Groq SQL | Groq result | Score / correct? | Model B: XiYanSQL SQL | XiYan result | Score / correct? | Latency (G/X) |
|---:|---|---|---|---|---|---|---:|
| 1 | `SELECT COUNT(*) AS total_customers FROM customers;` | 1 row(s): [{'total_customers': '180'}] | 14/14 ✓ | `SELECT COUNT(*) AS registered_customers_count FROM customers WHERE id IS NOT NULL;` | 1 row(s): [{'registered_customers_count': '180'}] | 14/14 ✓ | 2.98s / 6.96s |
| 2 | `SELECT p.category, COUNT(p.id) AS product_count FROM products p GROUP BY p.category ORDER BY product_count DESC;` | 10 row(s): [{'category': 'Electronics', 'product_count': '16'}, {'category': 'Fashion', 'product_count': '13'}, {'category': 'Accessories', … | 14/14 ✓ | `SELECT category, COUNT(id) AS product_count FROM products GROUP BY category ORDER BY product_count DESC;` | 10 row(s): [{'category': 'Electronics', 'product_count': '16'}, {'category': 'Fashion', 'product_count': '13'}, {'category': 'Accessories', … | 14/14 ✓ | 1.52s / 1.84s |
| 3 | `SELECT SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_…` | 1 row(s): [{'completed_orders': '353', 'cancelled_orders': '25'}] | 14/14 ✓ | `SELECT SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_…` | 1 row(s): [{'completed_orders': '353', 'cancelled_orders': '25'}] | 14/14 ✓ | 1.33s / 2.46s |
| 4 | `SELECT SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed';` | 1 row(s): [{'total_revenue': '4045965.00'}] | 14/14 ✓ | `SELECT SUM(p.amount) AS total_revenue FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status = 'completed';` | 1 row(s): [{'total_revenue': '4045965.00'}] | 12/14 ✓ | 1.55s / 2.77s |
| 5 | `SELECT DATE_TRUNC('month', o.order_date) AS month, COUNT(o.id) AS completed_orders FROM orders o WHERE o.status = 'completed' GROUP BY DATE_TRUNC('mo…` | 13 row(s): [{'month': '2025-08-31T18:30:00.000Z', 'completed_orders': '28'}, {'month': '2025-09-30T18:30:00.000Z', 'completed_orders': '28'}… | 14/14 ✓ | `SELECT DATE_TRUNC('month', order_date) AS month, COUNT(id) AS completed_orders FROM orders WHERE status = 'completed' GROUP BY DATE_TRUNC('month', or…` | 13 row(s): [{'month': '2025-08-31T18:30:00.000Z', 'completed_orders': '28'}, {'month': '2025-09-30T18:30:00.000Z', 'completed_orders': '28'}… | 14/14 ✓ | 2.97s / 2.87s |
| 6 | `SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_…` | 1 row(s): [{'category': 'Electronics', 'revenue': '2039938.00'}] | 14/14 ✓ | `SELECT p.category, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.pr…` | 1 row(s): [{'category': 'Electronics', 'total_revenue': '2039938.00'}] | 14/14 ✓ | 4.49s / 3.38s |
| 7 | `SELECT p.name AS product_name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi.product_id JOIN ord…` | 5 row(s): [{'product_name': 'Dell Inspiron 15', 'total_revenue': '881860.00'}, {'product_name': 'Samsung Galaxy A55', 'total_revenue': '719… | 14/14 ✓ | `SELECT p.id AS product_id, p.name AS product_name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi…` | 5 row(s): [{'product_id': 2, 'product_name': 'Dell Inspiron 15', 'total_revenue': '881860.00'}, {'product_id': 1, 'product_name': 'Samsung … | 14/14 ✓ | 16.50s / 4.00s |
| 8 | `SELECT c.id AS customer_id, c.name AS customer_name, COUNT(o.id) AS completed_order_count FROM customers c JOIN orders o ON c.id = o.customer_id WHER…` | 5 row(s): [{'customer_id': 23, 'customer_name': 'Kavitha Kumar', 'completed_order_count': '4'}, {'customer_id': 28, 'customer_name': 'Balaj… | 14/14 ✓ | `SELECT c.id AS customer_id, c.name AS customer_name, COUNT(o.id) AS order_count FROM customers c JOIN orders o ON c.id = o.customer_id WHERE o.status…` | 5 row(s): [{'customer_id': 23, 'customer_name': 'Kavitha Kumar', 'order_count': '4'}, {'customer_id': 28, 'customer_name': 'Balaji Kumar', … | 14/14 ✓ | 15.66s / 2.86s |
| 9 | `SELECT AVG(order_total) AS avg_order_value FROM (SELECT o.id AS order_id, SUM(oi.quantity * oi.unit_price) AS order_total FROM orders o JOIN order_it…` | 1 row(s): [{'avg_order_value': '11461.657223796034'}] | 14/14 ✓ | `SELECT AVG(oi.quantity * oi.unit_price) AS average_order_value FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed';` | 1 row(s): [{'average_order_value': '5095.6738035264483627'}] | 6/14 ✗ | 14.65s / 2.37s |
| 10 | `SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM products p JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_…` | 2 row(s): [{'category': 'Electronics', 'revenue': '2039938.00'}, {'category': 'Fashion', 'revenue': '350425.00'}] | 14/14 ✓ | `SELECT SUM(CASE WHEN p.category = 'Electronics' THEN oi.quantity * oi.unit_price ELSE 0 END) AS electronics_revenue, SUM(CASE WHEN p.category = 'Fash…` | 1 row(s): [{'electronics_revenue': '2039938.00', 'fashion_revenue': '350425.00'}] | 14/14 ✓ | 16.57s / 3.06s |
| 11 | `SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_items oi ON o.id = oi.order_i…` | 9 row(s): [{'month': '2025-12-31T18:30:00.000Z', 'revenue': '194804.00'}, {'month': '2026-01-31T18:30:00.000Z', 'revenue': '226946.00'}, {'… | 14/14 ✓ | `SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(p.amount) AS total_revenue FROM orders o JOIN payments p ON o.id = p.order_id WHERE EXTRACT(YE…` | 0 row(s):  | 6/14 ✗ | 10.44s / 3.58s |
| 12 | `SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.o…` | 1 row(s): [{'month': '2026-07-31T18:30:00.000Z', 'total_revenue': '518348.00'}] | 14/14 ✓ | `SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.o…` | 1 row(s): [{'month': '2026-07-31T18:30:00.000Z', 'total_revenue': '518348.00'}] | 14/14 ✓ | 17.20s / 2.98s |
| 13 | `SELECT c.id, c.name, COUNT(DISTINCT o.id) AS completed_order_count, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM customers c JOIN orders o …` | 153 row(s): [{'id': 125, 'name': 'Nandhini Sundaram', 'completed_order_count': '2', 'total_revenue': '247340.00'}, {'id': 170, 'name': 'Muthu… | 14/14 ✓ | `SELECT c.id AS customer_id, c.name AS customer_name, SUM(p.amount) AS total_revenue FROM customers c JOIN orders o ON c.id = o.customer_id JOIN payme…` | 153 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_revenue': '247340.00'}, {'customer_id': 170, 'customer_name': … | 14/14 ✓ | 14.76s / 3.78s |
| 14 | `SELECT c.id, c.name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM customers c JOIN orders o ON c.id = o.customer_id JOIN order_items oi ON …` | 5 row(s): [{'id': 125, 'name': 'Nandhini Sundaram', 'total_revenue': '247340.00'}, {'id': 170, 'name': 'Muthu Ganesan', 'total_revenue': '1… | 14/14 ✓ | `SELECT c.id AS customer_id, c.name AS customer_name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM customers c JOIN orders o ON c.id = o.cus…` | 5 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_revenue': '247340.00'}, {'customer_id': 170, 'customer_name': … | 6/14 ✗ | 16.17s / 4.51s |
| 15 | `SELECT p.category, SUM(oi.quantity * oi.unit_price) AS total_revenue, COUNT(DISTINCT oi.order_id) AS order_count, SUM(oi.quantity * oi.unit_price) / …` | 8 row(s): [{'category': 'Electronics', 'total_revenue': '2039938.00', 'order_count': '94', 'avg_revenue_per_order': '21701.468085106383'}, … | 13/14 ✓ | `SELECT p.category AS product_category, SUM(p.price * oi.quantity) AS total_revenue, COUNT(DISTINCT oi.order_id) AS number_of_orders, AVG(SUM(p.price …` | 8 row(s): [{'product_category': 'Accessories', 'total_revenue': '304512.00', 'number_of_orders': '106', 'average_revenue_per_order': '30451… | 6/14 ✗ | 16.28s / 3.08s |
| 16 | `WITH product_revenue AS ( SELECT p.id AS product_id, p.name AS product_name, SUM(oi.quantity * oi.unit_price) AS revenue FROM products p JOIN order_i…` | 16 row(s): [{'product_name': 'Dell Inspiron 15', 'revenue': '881860.00'}, {'product_name': 'Samsung Galaxy A55', 'revenue': '719982.00'}, {'… | 14/14 ✓ | `SELECT p.id AS product_id, p.name AS product_name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi…` | 13 row(s): [{'product_id': 71, 'product_name': 'AV Demo Cookware Set 08', 'total_revenue': '62652.00'}, {'product_id': 93, 'product_name': '… | 14/14 ✓ | 5.54s / 3.77s |
| 17 | `WITH customer_spending AS ( SELECT c.id AS customer_id, c.name AS customer_name, SUM(oi.quantity * oi.unit_price) AS total_spent FROM customers c JOI…` | 26 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_spent': '247340.00'}, {'customer_id': 170, 'customer_name': 'M… | 14/14 ✓ | `SELECT c.id AS customer_id, c.name AS customer_name, SUM(p.amount) AS total_spent FROM customers c JOIN orders o ON c.id = o.customer_id JOIN payment…` | 26 row(s): [{'customer_id': 71, 'customer_name': 'Aishwarya Subramanian', 'total_spent': '58716.00'}, {'customer_id': 84, 'customer_name': '… | 14/14 ✓ | 16.48s / 4.71s |
| 18 | `SELECT p.category, COUNT(DISTINCT o.id) AS completed_orders, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON…` | 8 row(s): [{'category': 'Accessories', 'completed_orders': '98', 'total_revenue': '270432.00'}, {'category': 'Beauty', 'completed_orders': … | 14/14 ✓ | `SELECT p.category FROM products p JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed' GROUP …` | 8 row(s): [{'category': 'Beauty'}, {'category': 'Groceries'}, {'category': 'Accessories'}, {'category': 'Electronics'}, {'category': 'Sport… | 7/14 ✗ | 16.18s / 3.28s |
| 19 | `WITH order_revenue AS ( SELECT o.id AS order_id, o.customer_id, SUM(oi.unit_price * oi.quantity) AS order_total FROM orders o JOIN order_items oi ON …` | 5 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_revenue': '247340.00', 'completed_orders': '2', 'avg_order_val… | 14/14 ✓ | `WITH customer_order_data AS ( SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total_revenue, COUNT(o.id) AS order_count FROM orders o JOIN …` | { "error": { "code": "QUERY_FAILED", "message": "PostgreSQL could not execute the query", "details": { "databaseCode": "42803", "databaseMe… | 5/14 ✗ | 16.59s / 5.52s |
| 20 | `WITH category_rev AS ( SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN pr…` | 1 row(s): [{'highest_category': 'Electronics', 'highest_revenue': '2039938.00', 'lowest_two_combined_revenue': '301288.00', 'highest_exceed… | 14/14 ✓ | `WITH category_revenue AS ( SELECT p.category, SUM(oi.quantity * oi.unit_price) AS category_total FROM order_items oi JOIN orders o ON oi.order_id = o…` | { "error": { "code": "INVALID_SQL", "message": "SQL could not be parsed: Syntax error at line 1 col 450:\n\n1 WITH category_revenue AS ( SE… | 3/14 ✗ | 19.96s / 4.50s |
| 21 | `WITH monthly_rev AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_items o…` | 1 row(s): [{'highest_month': '2026-07-31T18:30:00.000Z', 'highest_revenue': '518348.00', 'lowest_month': '2026-08-31T18:30:00.000Z', 'lowes… | 14/14 ✓ | `WITH monthly_revenue AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_ite…` | 2 row(s): [{'highest_revenue_month': '2026-08-31T18:30:00.000Z', 'max_revenue': '518348.00', 'min_revenue': '109285.00', 'percentage_differ… | 11/14 ✗ | 24.58s / 5.33s |
| 22 | `WITH order_totals AS ( SELECT o.id AS order_id, o.customer_id, SUM(oi.quantity * oi.unit_price) AS order_total FROM orders o JOIN order_items oi ON o…` | 1 row(s): [{'qualifying_customers': '25'}] | 14/14 ✓ | `WITH customer_order_counts AS ( SELECT o.customer_id, COUNT(o.id) AS order_count FROM orders o WHERE o.status = 'completed' GROUP BY o.customer_id HA…` | 1 row(s): [{'customer_count': '26'}] | 7/14 ✗ | 16.58s / 4.50s |
| 23 | `WITH monthly_rev AS ( SELECT p.category, DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM products p JOIN…` | 8 row(s): [{'category': 'Electronics', 'revenue_diff': '329299.00'}, {'category': 'Home & Kitchen', 'revenue_diff': '33636.00'}, {'category… | 14/14 ✓ | `WITH revenue_data AS ( SELECT p.category, DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS monthly_revenue FROM order_…` | 1 row(s): [{'category': 'Electronics', 'revenue_difference': '514447.00'}] | 13/14 ✓ | 16.80s / 5.01s |
| 24 | `WITH monthly_category_rev AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_…` | 13 row(s): [{'month': '2025-08-31T18:30:00.000Z', 'top_category': 'Fashion', 'revenue': '39352.00'}, {'month': '2025-09-30T18:30:00.000Z', '… | 14/14 ✓ | `WITH monthly_revenue AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JO…` | 0 row(s):  | 4/14 ✗ | 15.56s / 4.91s |
| 25 | `WITH total_rev AS ( SELECT SUM(p.amount) AS total_revenue FROM orders o JOIN payments p ON o.id = p.order_id WHERE o.status = 'completed' AND p.statu…` | 1 row(s): [{'total_revenue': None, 'top3_total_revenue': None, 'top3_contribution_pct': None}] | 6/14 ✗ | `WITH customer_revenue AS ( SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.ord…` | Unknown table(s): customer_revenue, ranked_customers | 5/14 ✗ | 10.86s / 7.28s |
| 26 | `WITH category_rev AS ( SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN pr…` | 1 row(s): [{'top_category': 'Electronics', 'top_category_revenue': '2039938.00', 'top_month_overall': '2026-07-31T18:30:00.000Z', 'top_mont… | 14/14 ✓ | `WITH revenue_by_category AS ( SELECT p.category, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi.p…` | 1 row(s): [{'highest_revenue_category': 'Electronics', 'month': '8', 'monthly_revenue': '552457.00'}] | 5/14 ✗ | 11.88s / 4.83s |
| 27 | `WITH total_rev AS ( SELECT SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status =…` | 5 row(s): [{'customer_id': 125, 'name': 'Nandhini Sundaram', 'revenue': '247340.00', 'revenue_share': '6.11325110325966734800', 'exceeds_10… | 14/14 ✓ | `WITH customer_revenue AS ( SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.ord…` | 5 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_revenue': '247340.00', 'revenue_share': '6.1132511032596673480… | 14/14 ✓ | 22.32s / 5.84s |
| 28 | `WITH monthly_category_rev AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders…` | 13 row(s): [{'month': '2025-08-31T18:30:00.000Z', 'top_category': 'Fashion', 'top_category_revenue': '39352.00', 'top_category_share': '0.21… | 12/14 ✓ | `WITH monthly_revenue AS ( SELECT DATE_TRUNC('month', p.payment_date) AS month, pr.category, SUM(p.amount) AS revenue FROM payments p JOIN order_items…` | 7 row(s): [{'category': 'Fashion', 'first_month_contribution': '68210.00', 'last_month_contribution': '43532.00', 'concentration_trend': 'D… | 5/14 ✗ | 21.61s / 6.34s |
| 29 | `WITH customer_revenue AS ( SELECT o.customer_id, SUM(p.amount) AS total_revenue FROM orders o JOIN payments p ON o.id = p.order_id WHERE p.status = '…` | 0 row(s):  | 6/14 ✗ | `WITH customer_revenue AS ( SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.ord…` | 17 row(s): [{'id': 125, 'name': 'Nandhini Sundaram', 'total_revenue': '247340.00'}, {'id': 135, 'name': 'Yazhini Sundaram', 'total_revenue':… | 5/14 ✗ | 10.75s / 5.53s |
| 30 | `WITH category_rev AS ( SELECT p.category AS label, SUM(oi.quantity * oi.unit_price) AS value, 'category' AS metric_type FROM order_items oi JOIN prod…` | { "error": { "code": "QUERY_FAILED", "message": "PostgreSQL could not execute the query", "details": { "databaseCode": "42804", "databaseMe… | 6/14 ✗ | `WITH revenue_data AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS monthly_revenue FROM orders o JOIN orde…` | { "error": { "code": "QUERY_FAILED", "message": "PostgreSQL could not execute the query", "details": { "databaseCode": "42804", "databaseMe… | 4/14 ✗ | 28.04s / 7.77s |

## Failure analysis

### XiYanSQL recurring weaknesses

- Q4: **Business interpretation: payment amount was used instead of item-derived completed-order revenue.**
- Q9: **Wrong aggregation grain: averaged item rows instead of first aggregating revenue per order.**
- Q11: **Incorrect filter/hallucination: used payments.status = 'succeeded', a value absent from the database.**
- Q14: **Wrong aggregation grain: COUNT(o.id) after joining order_items counts item rows, not distinct orders.**
- Q15: **Incorrect aggregation: used product list price and a windowed AVG(SUM(...)) rather than revenue per distinct order.**
- Q18: **Incorrect aggregation: counted order-item rows rather than distinct completed orders.**
- Q19: **SQL error 42803 and incorrect order-count grain.**
- Q20: **SQL syntax error: reserved alias 'or'; also omitted the required lowest-two comparison.**
- Q21: **Partial reasoning: returned high/low rows ambiguously instead of one explicit comparison row.**
- Q22: **Wrong AOV grain: compared against AVG(payment amount) and divided item revenue by duplicated order rows.**
- Q23: **Partial result: returned only one category and omitted completed-order filtering implied by benchmark context.**
- Q24: **Incorrect derived calculation: HAVING COUNT(*) > 1 is applied per month/category and removes the desired winners.**
- Q25: **Validation/execution failure caused by CTE names in tables_used; query construction also uses unnecessary self joins.**
- Q26: **Incorrect business interpretation: found only the top category's top month; never recomputed overall top month after removal.**
- Q28: **Incorrect join/aggregation: joining payment amount to item rows duplicates payments; compared revenue values rather than concentration shares.**
- Q29: **Wrong AOV grain and divisor: item-level average and all-system order count used instead of each customer's order-level AOV.**
- Q30: **SQL error 42804 from incompatible UNION column types; no complete analysis result.**

### Groq recurring weaknesses

- Q15: **Minor scope issue: added completed-order filtering although Q15 did not explicitly state it; aggregation grain is correct.**
- Q25: **Incorrect filter/hallucination: payments.status = 'completed' does not exist (the database uses 'captured'), producing empty evidence.**
- Q28: **Partial reasoning: returned monthly top-category shares but did not directly classify concentration change from first to last period.**
- Q29: **Incorrect filter/hallucination: payments.status = 'completed' makes customer revenue empty even though AOV grain is otherwise correct.**
- Q30: **SQL error 42804 from incompatible UNION label types; no complete analysis result.**

## Direct comparison findings

- Groq clearly outperformed XiYanSQL on Q9, Q14, Q15, Q18–Q22, Q24, Q26, Q28, and Q29.
- Q9 is the clearest aggregation-grain test: Groq correctly aggregated each order first and then averaged order totals; XiYanSQL averaged item rows.
- XiYanSQL generated PostgreSQL execution errors on Q19, Q20, and Q30. Groq's only execution failure was Q30.
- Both models failed Q30 because they tried to force heterogeneous analytical sections into one UNION with incompatible label types.
- Groq hallucinated `payments.status = 'completed'` on Q25 and Q29. This produced valid, executable SQL with the wrong empty result—exactly why execution rate alone is insufficient.
- XiYanSQL's local latency advantage was large: about 3.1× faster on average.

## Easiest and hardest questions

Easiest: Q1–Q3, Q5–Q8, Q10, Q12, Q13, Q16, and Q17. Both models produced acceptable SQL.

Hardest: Q19–Q30, particularly Q20, Q24–Q26, Q28–Q30. These require multiple aggregation grains, counterfactual recomputation, share calculations, or multiple analytical result sections.

## Final-answer and reasoning interpretation

In the current architecture, these two candidates are SQL agents; the downstream Analytics Agent remains Groq for both. Therefore, final-answer points were awarded only when the SQL result contained correct, sufficient database evidence for that identical downstream agent. No separate narrative answer was fabricated for XiYanSQL.

## Recommendation

**Use Groq `openai/gpt-oss-120b` for the production/hackathon SQL Agent today.** It achieved **393/420 (93.6%)**, versus XiYanSQL's **292/420 (69.5%)**, with substantially higher semantic correctness on multi-table and reasoning-heavy questions.

XiYanSQL is attractive for speed, privacy, offline use, and cost, but should currently be a fallback or fast-path model for basic questions only. Before promoting it, improve relationship metadata, provide known categorical values, and add targeted training/evaluation examples for order-level AOV, distinct-order counts, revenue shares, and counterfactual queries.

## Complete SQL evidence

### Q1

How many customers are currently registered in the E-Commerce system?

**Groq**

```sql
SELECT COUNT(*) AS total_customers FROM customers;
```

Result: 1 row(s): [{'total_customers': '180'}]

**XiYanSQL**

```sql
SELECT COUNT(*) AS registered_customers_count FROM customers WHERE id IS NOT NULL;
```

Result: 1 row(s): [{'registered_customers_count': '180'}]

### Q2

How many products are available in each product category?

**Groq**

```sql
SELECT p.category, COUNT(p.id) AS product_count FROM products p GROUP BY p.category ORDER BY product_count DESC;
```

Result: 10 row(s): [{'category': 'Electronics', 'product_count': '16'}, {'category': 'Fashion', 'product_count': '13'}, {'category': 'Accessories', …

**XiYanSQL**

```sql
SELECT category, COUNT(id) AS product_count FROM products GROUP BY category ORDER BY product_count DESC;
```

Result: 10 row(s): [{'category': 'Electronics', 'product_count': '16'}, {'category': 'Fashion', 'product_count': '13'}, {'category': 'Accessories', …

### Q3

How many orders have been completed and how many have been cancelled?

**Groq**

```sql
SELECT SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders
FROM orders;
```

Result: 1 row(s): [{'completed_orders': '353', 'cancelled_orders': '25'}]

**XiYanSQL**

```sql
SELECT SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders FROM orders;
```

Result: 1 row(s): [{'completed_orders': '353', 'cancelled_orders': '25'}]

### Q4

What is the total revenue generated from completed orders?

**Groq**

```sql
SELECT SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed';
```

Result: 1 row(s): [{'total_revenue': '4045965.00'}]

**XiYanSQL**

```sql
SELECT SUM(p.amount) AS total_revenue FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status = 'completed';
```

Result: 1 row(s): [{'total_revenue': '4045965.00'}]

### Q5

How many completed orders were placed each month?

**Groq**

```sql
SELECT DATE_TRUNC('month', o.order_date) AS month, COUNT(o.id) AS completed_orders FROM orders o WHERE o.status = 'completed' GROUP BY DATE_TRUNC('month', o.order_date) ORDER BY month ASC;
```

Result: 13 row(s): [{'month': '2025-08-31T18:30:00.000Z', 'completed_orders': '28'}, {'month': '2025-09-30T18:30:00.000Z', 'completed_orders': '28'}…

**XiYanSQL**

```sql
SELECT DATE_TRUNC('month', order_date) AS month, COUNT(id) AS completed_orders FROM orders WHERE status = 'completed' GROUP BY DATE_TRUNC('month', order_date) ORDER BY month ASC;
```

Result: 13 row(s): [{'month': '2025-08-31T18:30:00.000Z', 'completed_orders': '28'}, {'month': '2025-09-30T18:30:00.000Z', 'completed_orders': '28'}…

### Q6

Which product category generated the highest revenue from completed orders?

**Groq**

```sql
SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id WHERE o.status = 'completed' GROUP BY p.category ORDER BY revenue DESC LIMIT 1;
```

Result: 1 row(s): [{'category': 'Electronics', 'revenue': '2039938.00'}]

**XiYanSQL**

```sql
SELECT p.category, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id WHERE o.status = 'completed' GROUP BY p.category ORDER BY total_revenue DESC LIMIT 1;
```

Result: 1 row(s): [{'category': 'Electronics', 'total_revenue': '2039938.00'}]

### Q7

What are the top 5 products by total revenue from completed orders?

**Groq**

```sql
SELECT p.name AS product_name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed' GROUP BY p.id, p.name ORDER BY total_revenue DESC LIMIT 5;
```

Result: 5 row(s): [{'product_name': 'Dell Inspiron 15', 'total_revenue': '881860.00'}, {'product_name': 'Samsung Galaxy A55', 'total_revenue': '719…

**XiYanSQL**

```sql
SELECT p.id AS product_id, p.name AS product_name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed' GROUP BY p.id, p.name ORDER BY total_revenue DESC LIMIT 5;
```

Result: 5 row(s): [{'product_id': 2, 'product_name': 'Dell Inspiron 15', 'total_revenue': '881860.00'}, {'product_id': 1, 'product_name': 'Samsung …

### Q8

Which 5 customers have placed the most completed orders?

**Groq**

```sql
SELECT c.id AS customer_id, c.name AS customer_name, COUNT(o.id) AS completed_order_count FROM customers c JOIN orders o ON c.id = o.customer_id WHERE o.status = 'completed' GROUP BY c.id, c.name ORDER BY completed_order_count DESC LIMIT 5;
```

Result: 5 row(s): [{'customer_id': 23, 'customer_name': 'Kavitha Kumar', 'completed_order_count': '4'}, {'customer_id': 28, 'customer_name': 'Balaj…

**XiYanSQL**

```sql
SELECT c.id AS customer_id, c.name AS customer_name, COUNT(o.id) AS order_count FROM customers c JOIN orders o ON c.id = o.customer_id WHERE o.status = 'completed' GROUP BY c.id, c.name ORDER BY order_count DESC LIMIT 5;
```

Result: 5 row(s): [{'customer_id': 23, 'customer_name': 'Kavitha Kumar', 'order_count': '4'}, {'customer_id': 28, 'customer_name': 'Balaji Kumar', …

### Q9

What is the average order value across all completed orders?

**Groq**

```sql
SELECT AVG(order_total) AS avg_order_value FROM (SELECT o.id AS order_id, SUM(oi.quantity * oi.unit_price) AS order_total FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY o.id) sub;
```

Result: 1 row(s): [{'avg_order_value': '11461.657223796034'}]

**XiYanSQL**

```sql
SELECT AVG(oi.quantity * oi.unit_price) AS average_order_value FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed';
```

Result: 1 row(s): [{'average_order_value': '5095.6738035264483627'}]

### Q10

How much revenue was generated by Electronics products compared with Fashion products?

**Groq**

```sql
SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
  AND p.category IN ('Electronics', 'Fashion')
GROUP BY p.category
ORDER BY revenue DESC;
```

Result: 2 row(s): [{'category': 'Electronics', 'revenue': '2039938.00'}, {'category': 'Fashion', 'revenue': '350425.00'}]

**XiYanSQL**

```sql
SELECT SUM(CASE WHEN p.category = 'Electronics' THEN oi.quantity * oi.unit_price ELSE 0 END) AS electronics_revenue, SUM(CASE WHEN p.category = 'Fashion' THEN oi.quantity * oi.unit_price ELSE 0 END) AS fashion_revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id WHERE o.status = 'completed';
```

Result: 1 row(s): [{'electronics_revenue': '2039938.00', 'fashion_revenue': '350425.00'}]

### Q11

What was the revenue generated from completed orders during each month of 2026?

**Groq**

```sql
SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' AND o.order_date >= DATE '2026-01-01' AND o.order_date < DATE '2027-01-01' GROUP BY DATE_TRUNC('month', o.order_date) ORDER BY month ASC;
```

Result: 9 row(s): [{'month': '2025-12-31T18:30:00.000Z', 'revenue': '194804.00'}, {'month': '2026-01-31T18:30:00.000Z', 'revenue': '226946.00'}, {'…

**XiYanSQL**

```sql
SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(p.amount) AS total_revenue FROM orders o JOIN payments p ON o.id = p.order_id WHERE EXTRACT(YEAR FROM o.order_date) = 2026 AND o.status = 'completed' AND p.status = 'succeeded' GROUP BY DATE_TRUNC('month', o.order_date) ORDER BY month ASC;
```

Result: 0 row(s): 

### Q12

Which month had the highest completed-order revenue?

**Groq**

```sql
SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY DATE_TRUNC('month', o.order_date) ORDER BY total_revenue DESC LIMIT 1;
```

Result: 1 row(s): [{'month': '2026-07-31T18:30:00.000Z', 'total_revenue': '518348.00'}]

**XiYanSQL**

```sql
SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY DATE_TRUNC('month', o.order_date) ORDER BY total_revenue DESC LIMIT 1;
```

Result: 1 row(s): [{'month': '2026-07-31T18:30:00.000Z', 'total_revenue': '518348.00'}]

### Q13

Which customers have placed at least 2 completed orders, and what is their total revenue?

**Groq**

```sql
SELECT c.id, c.name, COUNT(DISTINCT o.id) AS completed_order_count, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM customers c JOIN orders o ON c.id = o.customer_id JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY c.id, c.name HAVING COUNT(DISTINCT o.id) >= 2 ORDER BY total_revenue DESC;
```

Result: 153 row(s): [{'id': 125, 'name': 'Nandhini Sundaram', 'completed_order_count': '2', 'total_revenue': '247340.00'}, {'id': 170, 'name': 'Muthu…

**XiYanSQL**

```sql
SELECT c.id AS customer_id, c.name AS customer_name, SUM(p.amount) AS total_revenue FROM customers c JOIN orders o ON c.id = o.customer_id JOIN payments p ON o.id = p.order_id WHERE o.status = 'completed' GROUP BY c.id, c.name HAVING COUNT(o.id) >= 2 ORDER BY total_revenue DESC;
```

Result: 153 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_revenue': '247340.00'}, {'customer_id': 170, 'customer_name': …

### Q14

Among customers with at least 2 completed orders, identify the top 5 customers by total revenue.

**Groq**

```sql
SELECT c.id, c.name, SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'completed'
GROUP BY c.id, c.name
HAVING COUNT(DISTINCT o.id) >= 2
ORDER BY total_revenue DESC
LIMIT 5;
```

Result: 5 row(s): [{'id': 125, 'name': 'Nandhini Sundaram', 'total_revenue': '247340.00'}, {'id': 170, 'name': 'Muthu Ganesan', 'total_revenue': '1…

**XiYanSQL**

```sql
SELECT c.id AS customer_id, c.name AS customer_name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM customers c JOIN orders o ON c.id = o.customer_id JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY c.id HAVING COUNT(o.id) >= 2 ORDER BY total_revenue DESC LIMIT 5;
```

Result: 5 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_revenue': '247340.00'}, {'customer_id': 170, 'customer_name': …

### Q15

For each product category, calculate total revenue, number of orders containing products from that category, and average revenue per order.

**Groq**

```sql
SELECT p.category,
       SUM(oi.quantity * oi.unit_price) AS total_revenue,
       COUNT(DISTINCT oi.order_id) AS order_count,
       SUM(oi.quantity * oi.unit_price) / NULLIF(COUNT(DISTINCT oi.order_id), 0) AS avg_revenue_per_order
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.category
ORDER BY total_revenue DESC;
```

Result: 8 row(s): [{'category': 'Electronics', 'total_revenue': '2039938.00', 'order_count': '94', 'avg_revenue_per_order': '21701.468085106383'}, …

**XiYanSQL**

```sql
SELECT p.category AS product_category, SUM(p.price * oi.quantity) AS total_revenue, COUNT(DISTINCT oi.order_id) AS number_of_orders, AVG(SUM(p.price * oi.quantity)) OVER (PARTITION BY p.category) AS average_revenue_per_order FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.category ORDER BY product_category;
```

Result: 8 row(s): [{'product_category': 'Accessories', 'total_revenue': '304512.00', 'number_of_orders': '106', 'average_revenue_per_order': '30451…

### Q16

Which products have generated revenue above the overall average product revenue?

**Groq**

```sql
WITH product_revenue AS (
    SELECT p.id AS product_id,
           p.name AS product_name,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM products p
    JOIN order_items oi ON p.id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed'
    GROUP BY p.id, p.name
), avg_revenue AS (
    SELECT AVG(revenue) AS avg_rev FROM product_revenue
)
SELECT pr.product_name,
       pr.revenue
FROM product_revenue pr, avg_revenue ar
WHERE pr.revenue > ar.avg_rev
ORDER BY pr.revenue DESC;
```

Result: 16 row(s): [{'product_name': 'Dell Inspiron 15', 'revenue': '881860.00'}, {'product_name': 'Samsung Galaxy A55', 'revenue': '719982.00'}, {'…

**XiYanSQL**

```sql
SELECT p.id AS product_id, p.name AS product_name, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.id, p.name HAVING SUM(oi.quantity * oi.unit_price) > ( SELECT AVG(total_revenue) FROM ( SELECT SUM(oi2.quantity * oi2.unit_price) AS total_revenue FROM order_items oi2 JOIN products p2 ON oi2.product_id = p2.id GROUP BY p2.id ) AS subquery );
```

Result: 13 row(s): [{'product_id': 71, 'product_name': 'AV Demo Cookware Set 08', 'total_revenue': '62652.00'}, {'product_id': 93, 'product_name': '…

### Q17

Which customers have spent more than the average customer spending on completed orders?

**Groq**

```sql
WITH customer_spending AS (
    SELECT c.id AS customer_id,
           c.name AS customer_name,
           SUM(oi.quantity * oi.unit_price) AS total_spent
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status = 'completed'
    GROUP BY c.id, c.name
), avg_spending AS (
    SELECT AVG(total_spent) AS avg_spent FROM customer_spending
)
SELECT cs.customer_id,
       cs.customer_name,
       cs.total_spent
FROM customer_spending cs, avg_spending a
WHERE cs.total_spent > a.avg_spent
ORDER BY cs.total_spent DESC;
```

Result: 26 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_spent': '247340.00'}, {'customer_id': 170, 'customer_name': 'M…

**XiYanSQL**

```sql
SELECT c.id AS customer_id, c.name AS customer_name, SUM(p.amount) AS total_spent FROM customers c JOIN orders o ON c.id = o.customer_id JOIN payments p ON o.id = p.order_id WHERE o.status = 'completed' GROUP BY c.id HAVING SUM(p.amount) > ( SELECT AVG(total_spent) FROM ( SELECT SUM(p2.amount) AS total_spent FROM customers c2 JOIN orders o2 ON c2.id = o2.customer_id JOIN payments p2 ON o2.id = p2.order_id WHERE o2.status = 'completed' GROUP BY c2.id ) AS subquery );
```

Result: 26 row(s): [{'customer_id': 71, 'customer_name': 'Aishwarya Subramanian', 'total_spent': '58716.00'}, {'customer_id': 84, 'customer_name': '…

### Q18

Which product categories have more than 10 completed orders and generated at least ₹100,000 in revenue?

**Groq**

```sql
SELECT p.category,
       COUNT(DISTINCT o.id) AS completed_orders,
       SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.category
HAVING COUNT(DISTINCT o.id) > 10
   AND SUM(oi.quantity * oi.unit_price) >= 100000;
```

Result: 8 row(s): [{'category': 'Accessories', 'completed_orders': '98', 'total_revenue': '270432.00'}, {'category': 'Beauty', 'completed_orders': …

**XiYanSQL**

```sql
SELECT p.category FROM products p JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed' GROUP BY p.category HAVING COUNT(oi.id) > 10 AND SUM(oi.quantity * oi.unit_price) >= 100000;
```

Result: 8 row(s): [{'category': 'Beauty'}, {'category': 'Groceries'}, {'category': 'Accessories'}, {'category': 'Electronics'}, {'category': 'Sport…

### Q19

Among customers who have placed at least 2 completed orders, identify the top 5 customers by total completed-order revenue. For each customer, show their total revenue, number of completed orders, and average order value. Then determine whether the customer with the highest average order value is also the customer with the highest total revenue.

**Groq**

```sql
WITH order_revenue AS (
    SELECT o.id AS order_id,
           o.customer_id,
           SUM(oi.unit_price * oi.quantity) AS order_total
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status = 'completed'
    GROUP BY o.id, o.customer_id
),
customer_agg AS (
    SELECT c.id AS customer_id,
           c.name AS customer_name,
           COUNT(orv.order_id) AS completed_orders,
           SUM(orv.order_total) AS total_revenue,
           AVG(orv.order_total) AS avg_order_value
    FROM customers c
    JOIN order_revenue orv ON c.id = orv.customer_id
    GROUP BY c.id, c.name
    HAVING COUNT(orv.order_id) >= 2
),
ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (ORDER BY total_revenue DESC) AS rev_rank,
           ROW_NUMBER() OVER (ORDER BY avg_order_value DESC) AS avg_rank
    FROM customer_agg
)
SELECT customer_id,
       customer_name,
       total_revenue,
       completed_orders,
       avg_order_value,
       CASE WHEN rev_rank = 1 AND avg_rank = 1 THEN TRUE ELSE FALSE END AS highest_rev_and_avg_same
FROM ranked
WHERE rev_rank <= 5
ORDER BY total_revenue DESC;
```

Result: 5 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_revenue': '247340.00', 'completed_orders': '2', 'avg_order_val…

**XiYanSQL**

```sql
WITH customer_order_data AS ( SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total_revenue, COUNT(o.id) AS order_count FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY o.customer_id HAVING COUNT(o.id) >= 2 ), customer_metrics AS ( SELECT cod.customer_id, SUM(cod.total_revenue) AS total_revenue, cod.order_count, AVG(cod.total_revenue / cod.order_count) AS avg_order_value FROM customer_order_data cod GROUP BY cod.customer_id ) SELECT c.id AS customer_id, cm.total_revenue, cm.order_count, cm.avg_order_value FROM customer_metrics cm JOIN customers c ON cm.customer_id = c.id ORDER BY cm.total_revenue DESC LIMIT 5;
```

Result: { "error": { "code": "QUERY_FAILED", "message": "PostgreSQL could not execute the query", "details": { "databaseCode": "42803", "databaseMe…

### Q20

Compare the revenue contribution of every product category to the overall completed-order revenue. Identify the highest-contributing category and determine whether its revenue exceeds the combined revenue of the two lowest-contributing categories.

**Groq**

```sql
WITH category_rev AS (
    SELECT p.category,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.status = 'completed'
    GROUP BY p.category
),
overall_rev AS (
    SELECT SUM(revenue) AS total_revenue FROM category_rev
),
ranked AS (
    SELECT category,
           revenue,
           ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rn_desc,
           ROW_NUMBER() OVER (ORDER BY revenue ASC) AS rn_asc
    FROM category_rev
)
SELECT 
    (SELECT category FROM ranked WHERE rn_desc = 1) AS highest_category,
    (SELECT revenue FROM ranked WHERE rn_desc = 1) AS highest_revenue,
    (SELECT SUM(revenue) FROM ranked WHERE rn_asc <= 2) AS lowest_two_combined_revenue,
    (SELECT CASE WHEN (SELECT revenue FROM ranked WHERE rn_desc = 1) > (SELECT SUM(revenue) FROM ranked WHERE rn_asc <= 2) THEN TRUE ELSE FALSE END) AS highest_exceeds_lowest_two,
    (SELECT total_revenue FROM overall_rev) AS overall_revenue;
```

Result: 1 row(s): [{'highest_category': 'Electronics', 'highest_revenue': '2039938.00', 'lowest_two_combined_revenue': '301288.00', 'highest_exceed…

**XiYanSQL**

```sql
WITH category_revenue AS ( SELECT p.category, SUM(oi.quantity * oi.unit_price) AS category_total FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id WHERE o.status = 'completed' GROUP BY p.category ), overall_revenue AS ( SELECT SUM(oi.quantity * oi.unit_price) AS total_revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed' ) SELECT cr.category, cr.category_total, or.total_revenue, cr.category_total / or.total_revenue AS contribution_ratio FROM category_revenue cr CROSS JOIN overall_revenue or ORDER BY cr.category_total DESC LIMIT 1;
```

Result: { "error": { "code": "INVALID_SQL", "message": "SQL could not be parsed: Syntax error at line 1 col 450:\n\n1 WITH category_revenue AS ( SE…

### Q21

Analyze the monthly completed-order revenue trend. Identify the highest and lowest revenue months and calculate the percentage difference between them.

**Groq**

```sql
WITH monthly_rev AS (
    SELECT DATE_TRUNC('month', o.order_date) AS month,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status = 'completed'
    GROUP BY DATE_TRUNC('month', o.order_date)
),
max_rev AS (
    SELECT month, revenue
    FROM monthly_rev
    ORDER BY revenue DESC
    LIMIT 1
),
min_rev AS (
    SELECT month, revenue
    FROM monthly_rev
    ORDER BY revenue ASC
    LIMIT 1
)
SELECT 
    max_rev.month AS highest_month,
    max_rev.revenue AS highest_revenue,
    min_rev.month AS lowest_month,
    min_rev.revenue AS lowest_revenue,
    ROUND(((max_rev.revenue - min_rev.revenue) / NULLIF(min_rev.revenue, 0)) * 100, 2) AS pct_difference
FROM max_rev, min_rev;
```

Result: 1 row(s): [{'highest_month': '2026-07-31T18:30:00.000Z', 'highest_revenue': '518348.00', 'lowest_month': '2026-08-31T18:30:00.000Z', 'lowes…

**XiYanSQL**

```sql
WITH monthly_revenue AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY DATE_TRUNC('month', o.order_date) ), highest_lowest_revenue AS ( SELECT MAX(revenue) AS max_revenue, MIN(revenue) AS min_revenue FROM monthly_revenue ) SELECT mr.month AS highest_revenue_month, hr.max_revenue, mlr.min_revenue, ((hr.max_revenue - mlr.min_revenue) / mlr.min_revenue) * 100 AS percentage_difference FROM monthly_revenue mr JOIN highest_lowest_revenue hr ON true JOIN highest_lowest_revenue mlr ON true WHERE mr.revenue = hr.max_revenue OR mr.revenue = mlr.min_revenue ORDER BY percentage_difference DESC LIMIT 2;
```

Result: 2 row(s): [{'highest_revenue_month': '2026-08-31T18:30:00.000Z', 'max_revenue': '518348.00', 'min_revenue': '109285.00', 'percentage_differ…

### Q22

Identify customers who have placed at least 3 completed orders but whose average order value is below the overall average order value. How many such customers are there?

**Groq**

```sql
WITH order_totals AS (
    SELECT o.id AS order_id,
           o.customer_id,
           SUM(oi.quantity * oi.unit_price) AS order_total
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status = 'completed'
    GROUP BY o.id, o.customer_id
),
overall_avg AS (
    SELECT AVG(order_total) AS avg_value
    FROM order_totals
),
customer_stats AS (
    SELECT ot.customer_id,
           COUNT(*) AS completed_order_cnt,
           AVG(order_total) AS avg_order_value
    FROM order_totals ot
    GROUP BY ot.customer_id
    HAVING COUNT(*) >= 3
)
SELECT COUNT(*) AS qualifying_customers
FROM customer_stats cs, overall_avg oa
WHERE cs.avg_order_value < oa.avg_value;
```

Result: 1 row(s): [{'qualifying_customers': '25'}]

**XiYanSQL**

```sql
WITH customer_order_counts AS ( SELECT o.customer_id, COUNT(o.id) AS order_count FROM orders o WHERE o.status = 'completed' GROUP BY o.customer_id HAVING COUNT(o.id) >= 3 ), overall_avg_order_value AS ( SELECT AVG(p.amount) AS avg_order_value FROM payments p ) SELECT COUNT(*) AS customer_count FROM customer_order_counts co JOIN overall_avg_order_value oav ON (SELECT SUM(oi.quantity * oi.unit_price) / COUNT(o.id) FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.customer_id = co.customer_id AND o.status = 'completed') < oav.avg_order_value;
```

Result: 1 row(s): [{'customer_count': '26'}]

### Q23

Which product categories experienced the largest difference between their highest-revenue and lowest-revenue months?

**Groq**

```sql
WITH monthly_rev AS (
    SELECT p.category,
           DATE_TRUNC('month', o.order_date) AS month,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM products p
    JOIN order_items oi ON p.id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed'
    GROUP BY p.category, DATE_TRUNC('month', o.order_date)
),
category_diff AS (
    SELECT category,
           MAX(revenue) - MIN(revenue) AS revenue_diff
    FROM monthly_rev
    GROUP BY category
)
SELECT category, revenue_diff
FROM category_diff
ORDER BY revenue_diff DESC;
```

Result: 8 row(s): [{'category': 'Electronics', 'revenue_diff': '329299.00'}, {'category': 'Home & Kitchen', 'revenue_diff': '33636.00'}, {'category…

**XiYanSQL**

```sql
WITH revenue_data AS ( SELECT p.category, DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS monthly_revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id GROUP BY p.category, DATE_TRUNC('month', o.order_date) ), category_revenue AS ( SELECT rd.category, MIN(rd.monthly_revenue) AS min_revenue, MAX(rd.monthly_revenue) AS max_revenue FROM revenue_data rd GROUP BY rd.category ) SELECT cr.category, cr.max_revenue - cr.min_revenue AS revenue_difference FROM category_revenue cr ORDER BY revenue_difference DESC LIMIT 1;
```

Result: 1 row(s): [{'category': 'Electronics', 'revenue_difference': '514447.00'}]

### Q24

For each month, identify the product category that generated the highest revenue. Determine whether the same category dominated multiple months.

**Groq**

```sql
WITH monthly_category_rev AS (
    SELECT DATE_TRUNC('month', o.order_date) AS month,
           p.category,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.status = 'completed'
    GROUP BY DATE_TRUNC('month', o.order_date), p.category
),
ranked AS (
    SELECT month,
           category,
           revenue,
           ROW_NUMBER() OVER (PARTITION BY month ORDER BY revenue DESC) AS rn
    FROM monthly_category_rev
)
SELECT month,
       category AS top_category,
       revenue
FROM ranked
WHERE rn = 1
ORDER BY month ASC;
```

Result: 13 row(s): [{'month': '2025-08-31T18:30:00.000Z', 'top_category': 'Fashion', 'revenue': '39352.00'}, {'month': '2025-09-30T18:30:00.000Z', '…

**XiYanSQL**

```sql
WITH monthly_revenue AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id GROUP BY DATE_TRUNC('month', o.order_date), p.category ), ranked_categories AS ( SELECT month, category, revenue, RANK() OVER (PARTITION BY month ORDER BY revenue DESC) AS rank FROM monthly_revenue ) SELECT rc1.month, rc1.category AS top_category, COUNT(*) AS dominance_count FROM ranked_categories rc1 WHERE rc1.rank = 1 GROUP BY rc1.month, rc1.category HAVING COUNT(*) > 1 ORDER BY rc1.month ASC;
```

Result: 0 row(s): 

### Q25

Identify the top 3 customers by revenue and compare their contribution to the total completed-order revenue. What percentage of total revenue comes from these three customers?

**Groq**

```sql
WITH total_rev AS (
    SELECT SUM(p.amount) AS total_revenue
    FROM orders o
    JOIN payments p ON o.id = p.order_id
    WHERE o.status = 'completed' AND p.status = 'completed'
),
customer_rev AS (
    SELECT c.id AS customer_id, c.name, SUM(p.amount) AS revenue
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    JOIN payments p ON o.id = p.order_id
    WHERE o.status = 'completed' AND p.status = 'completed'
    GROUP BY c.id, c.name
),
top3 AS (
    SELECT cr.customer_id,
           cr.name,
           cr.revenue,
           ROUND(cr.revenue / tr.total_revenue * 100, 2) AS revenue_pct
    FROM customer_rev cr
    CROSS JOIN total_rev tr
    ORDER BY cr.revenue DESC
    LIMIT 3
)
SELECT tr.total_revenue,
       (SELECT SUM(revenue) FROM top3) AS top3_total_revenue,
       ROUND((SELECT SUM(revenue) FROM top3) / tr.total_revenue * 100, 2) AS top3_contribution_pct
FROM total_rev tr;
```

Result: 1 row(s): [{'total_revenue': None, 'top3_total_revenue': None, 'top3_contribution_pct': None}]

**XiYanSQL**

```sql
WITH customer_revenue AS ( SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY o.customer_id ), ranked_customers AS ( SELECT cr.customer_id, cr.total_revenue, RANK() OVER (ORDER BY cr.total_revenue DESC) AS revenue_rank FROM customer_revenue cr ) SELECT rc1.customer_id AS top_customer_1, rc2.customer_id AS top_customer_2, rc3.customer_id AS top_customer_3, SUM(rc1.total_revenue) + SUM(rc2.total_revenue) + SUM(rc3.total_revenue) AS total_top_revenue, (SUM(rc1.total_revenue) + SUM(rc2.total_revenue) + SUM(rc3.total_revenue)) / (SELECT SUM(cr.total_revenue) FROM customer_revenue cr) * 100 AS top_revenue_percentage FROM ranked_customers rc1 JOIN ranked_customers rc2 ON rc1.revenue_rank = 1 AND rc2.revenue_rank = 2 JOIN ranked_customers rc3 ON rc1.revenue_rank = 1 AND rc2.revenue_rank = 2 AND rc3.revenue_rank = 3;
```

Result: Unknown table(s): customer_revenue, ranked_customers

### Q26

Find the product category with the highest revenue. Then determine whether removing that category would change which month had the highest overall revenue. Explain the impact.

**Groq**

```sql
WITH category_rev AS ( SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id WHERE o.status = 'completed' GROUP BY p.category ), top_category AS ( SELECT category, revenue FROM category_rev ORDER BY revenue DESC LIMIT 1 ), overall_monthly AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id WHERE o.status = 'completed' GROUP BY DATE_TRUNC('month', o.order_date) ), monthly_excluding AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id JOIN top_category tc ON p.category <> tc.category WHERE o.status = 'completed' GROUP BY DATE_TRUNC('month', o.order_date) ), top_month_overall AS ( SELECT month FROM overall_monthly ORDER BY revenue DESC LIMIT 1 ), top_month_excluding AS ( SELECT month FROM monthly_excluding ORDER BY revenue DESC LIMIT 1 ) SELECT tc.category AS top_category, tc.revenue AS top_category_revenue, tmo.month AS top_month_overall, tme.month AS top_month_excluding, CASE WHEN tmo.month <> tme.month THEN TRUE ELSE FALSE END AS month_changed FROM top_category tc CROSS JOIN top_month_overall tmo CROSS JOIN top_month_excluding tme;
```

Result: 1 row(s): [{'top_category': 'Electronics', 'top_category_revenue': '2039938.00', 'top_month_overall': '2026-07-31T18:30:00.000Z', 'top_mont…

**XiYanSQL**

```sql
WITH revenue_by_category AS ( SELECT p.category, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.category ), highest_revenue_category AS ( SELECT category FROM revenue_by_category ORDER BY total_revenue DESC LIMIT 1 ) SELECT hrc.category AS highest_revenue_category, EXTRACT(MONTH FROM o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS monthly_revenue FROM highest_revenue_category hrc JOIN products p ON hrc.category = p.category JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_id = o.id GROUP BY hrc.category, EXTRACT(MONTH FROM o.order_date) ORDER BY monthly_revenue DESC LIMIT 1;
```

Result: 1 row(s): [{'highest_revenue_category': 'Electronics', 'month': '8', 'monthly_revenue': '552457.00'}]

### Q27

Identify the top 5 customers by total revenue. For each one, calculate their share of the overall completed-order revenue and determine whether any individual customer contributes more than 10% of total revenue.

**Groq**

```sql
WITH total_rev AS (
    SELECT SUM(oi.quantity * oi.unit_price) AS total_revenue
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status = 'completed'
),
customer_rev AS (
    SELECT c.id AS customer_id,
           c.name,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status = 'completed'
    GROUP BY c.id, c.name
),
ranked AS (
    SELECT cr.customer_id,
           cr.name,
           cr.revenue,
           (cr.revenue / tr.total_revenue) * 100 AS revenue_share,
           CASE WHEN (cr.revenue / tr.total_revenue) > 0.10 THEN TRUE ELSE FALSE END AS exceeds_10_percent,
           ROW_NUMBER() OVER (ORDER BY cr.revenue DESC) AS rn
    FROM customer_rev cr
    CROSS JOIN total_rev tr
)
SELECT customer_id,
       name,
       revenue,
       revenue_share,
       exceeds_10_percent
FROM ranked
WHERE rn <= 5
ORDER BY revenue DESC;
```

Result: 5 row(s): [{'customer_id': 125, 'name': 'Nandhini Sundaram', 'revenue': '247340.00', 'revenue_share': '6.11325110325966734800', 'exceeds_10…

**XiYanSQL**

```sql
WITH customer_revenue AS ( SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY o.customer_id ), ranked_customers AS ( SELECT c.id AS customer_id, c.name AS customer_name, cr.total_revenue, RANK() OVER (ORDER BY cr.total_revenue DESC) AS rank FROM customers c JOIN customer_revenue cr ON c.id = cr.customer_id ) SELECT rc.customer_id, rc.customer_name, rc.total_revenue, (rc.total_revenue / (SELECT SUM(total_revenue) FROM customer_revenue)) * 100 AS revenue_share, CASE WHEN (rc.total_revenue / (SELECT SUM(total_revenue) FROM customer_revenue)) > 10 THEN 'Major Contributor' ELSE 'Minor Contributor' END AS contribution_status FROM ranked_customers rc WHERE rc.rank <= 5 ORDER BY rc.total_revenue DESC;
```

Result: 5 row(s): [{'customer_id': 125, 'customer_name': 'Nandhini Sundaram', 'total_revenue': '247340.00', 'revenue_share': '6.1132511032596673480…

### Q28

Determine whether revenue is becoming more or less concentrated among product categories over the available months. Compare the highest-revenue category's contribution at the beginning and end of the period.

**Groq**

```sql
WITH monthly_category_rev AS (
    SELECT DATE_TRUNC('month', o.order_date) AS month,
           p.category,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.status = 'completed'
    GROUP BY DATE_TRUNC('month', o.order_date), p.category
),
monthly_total AS (
    SELECT month, SUM(revenue) AS total_rev
    FROM monthly_category_rev
    GROUP BY month
),
monthly_rank AS (
    SELECT mcr.month,
           mcr.category,
           mcr.revenue,
           mt.total_rev,
           mcr.revenue / mt.total_rev AS share,
           ROW_NUMBER() OVER (PARTITION BY mcr.month ORDER BY mcr.revenue DESC) AS rn
    FROM monthly_category_rev mcr
    JOIN monthly_total mt ON mcr.month = mt.month
)
SELECT month,
       category AS top_category,
       revenue AS top_category_revenue,
       share AS top_category_share
FROM monthly_rank
WHERE rn = 1
ORDER BY month ASC;
```

Result: 13 row(s): [{'month': '2025-08-31T18:30:00.000Z', 'top_category': 'Fashion', 'top_category_revenue': '39352.00', 'top_category_share': '0.21…

**XiYanSQL**

```sql
WITH monthly_revenue AS ( SELECT DATE_TRUNC('month', p.payment_date) AS month, pr.category, SUM(p.amount) AS revenue FROM payments p JOIN order_items oi ON p.order_id = oi.order_id JOIN products pr ON oi.product_id = pr.id GROUP BY DATE_TRUNC('month', p.payment_date), pr.category ), first_month_revenue AS ( SELECT category, SUM(revenue) AS first_month_total FROM monthly_revenue WHERE month = (SELECT MIN(month) FROM monthly_revenue) GROUP BY category ), last_month_revenue AS ( SELECT category, SUM(revenue) AS last_month_total FROM monthly_revenue WHERE month = (SELECT MAX(month) FROM monthly_revenue) GROUP BY category ) SELECT fm.category, fm.first_month_total AS first_month_contribution, lm.last_month_total AS last_month_contribution, CASE WHEN fm.first_month_total > lm.last_month_total THEN 'Decreasing' ELSE 'Increasing' END AS concentration_trend FROM first_month_revenue fm JOIN last_month_revenue lm ON fm.category = lm.category ORDER BY fm.first_month_total DESC;
```

Result: 7 row(s): [{'category': 'Fashion', 'first_month_contribution': '68210.00', 'last_month_contribution': '43532.00', 'concentration_trend': 'D…

### Q29

Find customers who have a high total revenue but a relatively low average order value. Define "high total revenue" as being in the top 10% of customers by revenue and "low average order value" as being below the overall average order value.

**Groq**

```sql
WITH customer_revenue AS (
  SELECT o.customer_id,
         SUM(p.amount) AS total_revenue
  FROM orders o
  JOIN payments p ON o.id = p.order_id
  WHERE p.status = 'completed'
  GROUP BY o.customer_id
),
order_totals AS (
  SELECT o.id AS order_id,
         o.customer_id,
         SUM(oi.quantity * oi.unit_price) AS order_total
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  WHERE o.status = 'completed'
  GROUP BY o.id, o.customer_id
),
customer_avg_order AS (
  SELECT customer_id,
         AVG(order_total) AS avg_order_value
  FROM order_totals
  GROUP BY customer_id
),
overall_avg AS (
  SELECT AVG(order_total) AS overall_avg_order_value
  FROM order_totals
),
revenue_threshold AS (
  SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_revenue) AS rev_thresh
  FROM customer_revenue
)
SELECT c.id,
       c.name,
       cr.total_revenue,
       ca.avg_order_value
FROM customers c
JOIN customer_revenue cr ON c.id = cr.customer_id
JOIN customer_avg_order ca ON c.id = ca.customer_id
CROSS JOIN overall_avg oa
CROSS JOIN revenue_threshold rt
WHERE cr.total_revenue >= rt.rev_thresh
  AND ca.avg_order_value < oa.overall_avg_order_value
ORDER BY cr.total_revenue DESC;
```

Result: 0 row(s): 

**XiYanSQL**

```sql
WITH customer_revenue AS ( SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id GROUP BY o.customer_id ), overall_avg_order_value AS ( SELECT AVG(oi.quantity * oi.unit_price) AS avg_order_value FROM order_items oi JOIN orders o ON oi.order_id = o.id ) SELECT c.id, c.name, cr.total_revenue FROM customers c JOIN customer_revenue cr ON c.id = cr.customer_id CROSS JOIN overall_avg_order_value oav WHERE cr.total_revenue >= (SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_revenue) FROM customer_revenue) AND cr.total_revenue / (SELECT COUNT(*) FROM orders) < (SELECT avg_order_value FROM overall_avg_order_value) ORDER BY cr.total_revenue DESC;
```

Result: 17 row(s): [{'id': 125, 'name': 'Nandhini Sundaram', 'total_revenue': '247340.00'}, {'id': 135, 'name': 'Yazhini Sundaram', 'total_revenue':…

### Q30

Perform a complete business performance analysis of the E-Commerce database. Identify the strongest product categories, highest-value customers, monthly revenue trends, and any significant changes or anomalies. Support every conclusion with database-derived numbers and provide actionable business recommendations.

**Groq**

```sql
WITH category_rev AS (
    SELECT p.category AS label,
           SUM(oi.quantity * oi.unit_price) AS value,
           'category' AS metric_type
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed'
    GROUP BY p.category
),
customer_rev AS (
    SELECT c.id AS label,
           SUM(oi.quantity * oi.unit_price) AS value,
           'customer' AS metric_type
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    WHERE o.status = 'completed'
    GROUP BY c.id
),
monthly_rev AS (
    SELECT DATE_TRUNC('month', o.order_date) AS label,
           SUM(oi.quantity * oi.unit_price) AS value,
           'monthly' AS metric_type
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed'
    GROUP BY DATE_TRUNC('month', o.order_date)
),
monthly_change AS (
    SELECT DATE_TRUNC('month', o.order_date) AS month,
           SUM(oi.quantity * oi.unit_price) AS revenue,
           LAG(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY DATE_TRUNC('month', o.order_date)) AS prev_revenue,
           (SUM(oi.quantity * oi.unit_price) - LAG(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY DATE_TRUNC('month', o.order_date))) AS change_amount,
           CASE WHEN LAG(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY DATE_TRUNC('month', o.order_date)) = 0 THEN NULL
                ELSE (SUM(oi.quantity * oi.unit_price) - LAG(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY DATE_TRUNC('month', o.order_date))) / LAG(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY DATE_TRUNC('month', o.order_date)) * 100
           END AS pct_change,
           'monthly_change' AS metric_type
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed'
    GROUP BY DATE_TRUNC('month', o.order_date)
)
SELECT metric_type,
       label,
       value
FROM (
    SELECT metric_type, label, value FROM category_rev
    UNION ALL
    SELECT metric_type, label, value FROM customer_rev
    UNION ALL
    SELECT metric_type, label, value FROM monthly_rev
    UNION ALL
    SELECT metric_type, month::date AS label, pct_change AS value FROM monthly_change
) sub
ORDER BY metric_type, value DESC;
```

Result: { "error": { "code": "QUERY_FAILED", "message": "PostgreSQL could not execute the query", "details": { "databaseCode": "42804", "databaseMe…

**XiYanSQL**

```sql
WITH revenue_data AS ( SELECT DATE_TRUNC('month', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS monthly_revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id GROUP BY DATE_TRUNC('month', o.order_date) ), customer_value AS ( SELECT c.id AS customer_id, SUM(p.price * oi.quantity) AS total_spent FROM customers c JOIN orders o ON c.id = o.customer_id JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id GROUP BY c.id ORDER BY total_spent DESC LIMIT 10 ), category_sales AS ( SELECT p.category, SUM(oi.quantity * oi.unit_price) AS category_revenue FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.category ) SELECT 'Monthly Revenue Trends' AS analysis_type, TO_CHAR(rd.month, 'YYYY-MM') AS month, rd.monthly_revenue AS metric_value FROM revenue_data rd UNION ALL SELECT 'Strongest Product Categories' AS analysis_type, cs.category AS category_name, cs.category_revenue AS metric_value FROM category_sales cs UNION ALL SELECT 'Highest-Value Customers' AS analysis_type, cv.customer_id AS customer_id, cv.total_spent AS metric_value FROM customer_value cv ORDER BY analysis_type, metric_value DESC;
```

Result: { "error": { "code": "QUERY_FAILED", "message": "PostgreSQL could not execute the query", "details": { "databaseCode": "42804", "databaseMe…
