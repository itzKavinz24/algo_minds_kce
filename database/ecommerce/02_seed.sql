\set ON_ERROR_STOP on
\if :{?as_of_date}
\else
SELECT current_date::text AS as_of_date \gset
\endif

BEGIN;
SET LOCAL search_path = pg_catalog, public;
SELECT pg_advisory_xact_lock(81723002);

DO $$
DECLARE missing_columns text;
BEGIN
  IF current_database() <> 'ecommerce_db' THEN
    RAISE EXCEPTION 'Connect to ecommerce_db before running this seed';
  END IF;
  SELECT string_agg(e.table_name || '.' || e.column_name, ', ' ORDER BY 1)
  INTO missing_columns
  FROM (VALUES
    ('customers','id'),('customers','name'),('customers','email'),('customers','city'),('customers','created_at'),
    ('products','id'),('products','name'),('products','category'),('products','price'),
    ('orders','id'),('orders','customer_id'),('orders','order_date'),('orders','status'),
    ('order_items','id'),('order_items','order_id'),('order_items','product_id'),
    ('order_items','quantity'),('order_items','unit_price'),
    ('payments','id'),('payments','order_id'),('payments','payment_date'),
    ('payments','amount'),('payments','payment_method'),('payments','status')
  ) AS e(table_name,column_name)
  LEFT JOIN information_schema.columns c
    ON c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name
  WHERE c.column_name IS NULL;
  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Existing ecommerce schema is incompatible; missing: %', missing_columns;
  END IF;
END $$;

CREATE TEMP TABLE seed_config ON COMMIT DROP AS
SELECT :'as_of_date'::date AS as_of_date,
       date_trunc('month', :'as_of_date'::date)::date AS anchor;

INSERT INTO public.customers(name,email,city,created_at)
SELECT
  (ARRAY['Arun','Priya','Karthik','Divya','Senthil','Meena','Saravanan','Kavitha','Vignesh','Nandhini',
         'Dinesh','Revathi','Balaji','Janani','Muthu','Aishwarya','Prakash','Lakshmi','Suresh','Yazhini'])[(n-1)%20+1]
  || ' ' ||
  (ARRAY['Kumar','Raman','Subramanian','Krishnan','Murugan','Sundaram','Selvam','Ganesan','Rajendran'])[((n-1)/20)%9+1],
  'av-demo-customer-' || lpad(n::text,3,'0') || '@example.invalid',
  (ARRAY['Chennai','Coimbatore','Madurai','Salem','Erode','Tiruppur','Trichy','Tirunelveli','Thoothukudi','Thanjavur'])[(n-1)%10+1],
  (cfg.anchor - interval '18 months' + (n%120)*interval '1 day')::timestamp
FROM generate_series(1,170) AS n CROSS JOIN seed_config cfg
ON CONFLICT (email) DO UPDATE SET
  name=excluded.name, city=excluded.city, created_at=excluded.created_at;

INSERT INTO public.products(name,category,price)
SELECT product_name,category,price
FROM (
  SELECT
    'AV Demo ' ||
      (ARRAY['Wireless Earbuds','Cotton Saree','Cookware Set','Filter Coffee','Badminton Racquet','Tamil Novel','Laptop Sleeve','Herbal Face Wash'])[(n-1)%8+1]
      || ' ' || lpad((((n-1)/8)+1)::text,2,'0') AS product_name,
    (ARRAY['Electronics','Fashion','Home & Kitchen','Groceries','Sports','Books','Accessories','Beauty'])[(n-1)%8+1] AS category,
    (ARRAY[2499,1499,2199,480,1799,399,999,349])[(n-1)%8+1] + (((n-1)/8)*75) AS price
  FROM generate_series(1,88) AS n
) AS proposed
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.name=proposed.product_name);

-- Rebuild only controlled demo orders; existing business rows remain intact.
DELETE FROM public.payments p USING public.orders o, public.customers c
WHERE p.order_id=o.id AND o.customer_id=c.id
  AND c.email LIKE 'av-demo-customer-%@example.invalid';
DELETE FROM public.order_items i USING public.orders o, public.customers c
WHERE i.order_id=o.id AND o.customer_id=c.id
  AND c.email LIKE 'av-demo-customer-%@example.invalid';
DELETE FROM public.orders o USING public.customers c
WHERE o.customer_id=c.id
  AND c.email LIKE 'av-demo-customer-%@example.invalid';

CREATE TEMP TABLE seed_order_plan (
  seed_key integer PRIMARY KEY, month_offset integer NOT NULL, slot integer NOT NULL,
  customer_email text NOT NULL, order_date date NOT NULL, status text NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_order_plan(seed_key,month_offset,slot,customer_email,order_date,status)
WITH slots AS (
  SELECT m,s,cfg.as_of_date,cfg.anchor,(cfg.anchor+m*interval '1 month')::date AS month_start
  FROM seed_config cfg CROSS JOIN generate_series(-12,0) AS m
  CROSS JOIN LATERAL generate_series(1,CASE WHEN m=0 THEN 18 ELSE 30 END) AS s
), planned AS (
  SELECT *,
    CASE WHEN m=0 THEN 2+((s-1)%9)+10*((s*3)%16)
         ELSE 1+(((m+12)*30+s-1)%170) END AS customer_number,
    CASE WHEN m=0 THEN extract(day FROM as_of_date)::integer
         ELSE extract(day FROM month_start+interval '1 month - 1 day')::integer END AS available_days
  FROM slots
)
SELECT (m+12)*100+s,m,s,
       'av-demo-customer-'||lpad(customer_number::text,3,'0')||'@example.invalid',
       month_start+((s*7+m+120)%greatest(available_days,1)),
       CASE WHEN s%15=0 THEN 'cancelled' ELSE 'completed' END
FROM planned;

CREATE TEMP TABLE seed_order_map (
  seed_key integer PRIMARY KEY, month_offset integer NOT NULL, slot integer NOT NULL,
  order_id integer NOT NULL UNIQUE, order_date date NOT NULL, status text NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE plan record; generated_order_id integer;
BEGIN
  FOR plan IN SELECT * FROM seed_order_plan ORDER BY seed_key LOOP
    generated_order_id := NULL;
    INSERT INTO public.orders(customer_id,order_date,status)
    SELECT c.id,plan.order_date,plan.status FROM public.customers c
    WHERE c.email=plan.customer_email
    RETURNING id INTO generated_order_id;
    IF generated_order_id IS NULL THEN
      RAISE EXCEPTION 'Could not resolve seeded customer %', plan.customer_email;
    END IF;
    INSERT INTO seed_order_map VALUES
      (plan.seed_key,plan.month_offset,plan.slot,generated_order_id,plan.order_date,plan.status);
  END LOOP;
END $$;

CREATE TEMP TABLE seed_product_catalog ON COMMIT DROP AS
SELECT id,name,category,price,
       row_number() OVER (PARTITION BY category ORDER BY name,id)::integer AS category_row,
       count(*) OVER (PARTITION BY category)::integer AS category_count
FROM public.products;

-- Two or three products per order. The current month omits Electronics and its
-- buyers omit Chennai, creating discoverable category/city evidence.
INSERT INTO public.order_items(order_id,product_id,quantity,unit_price)
SELECT m.order_id,p.id,1+((m.slot+item.item_no)%3),p.price
FROM seed_order_map m
CROSS JOIN LATERAL generate_series(1,CASE WHEN m.slot%4=0 THEN 3 ELSE 2 END) AS item(item_no)
CROSS JOIN LATERAL (
  SELECT CASE WHEN m.month_offset=0
    THEN (ARRAY['Fashion','Home & Kitchen','Groceries','Sports','Books','Accessories','Beauty'])[((m.slot+item.item_no*2-1)%7)+1]
    ELSE (ARRAY['Electronics','Fashion','Home & Kitchen','Groceries','Sports','Books','Accessories','Beauty'])[((m.slot+item.item_no*2+m.month_offset+23)%8)+1]
  END AS category
) chosen
JOIN seed_product_catalog p ON p.category=chosen.category
 AND p.category_row=1+((m.slot*3+item.item_no)%p.category_count);

INSERT INTO public.payments(order_id,payment_date,amount,payment_method,status)
SELECT m.order_id,m.order_date,sum(i.quantity*i.unit_price),
       (ARRAY['UPI','Card','Net Banking','Cash on Delivery'])[(m.slot-1)%4+1],
       'captured'
FROM seed_order_map m JOIN public.order_items i ON i.order_id=m.order_id
WHERE m.status='completed'
GROUP BY m.order_id,m.order_date,m.slot;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM seed_order_map m LEFT JOIN public.order_items i ON i.order_id=m.order_id
    GROUP BY m.order_id HAVING count(i.id)<2
  ) THEN RAISE EXCEPTION 'Seeded order without at least two items'; END IF;
END $$;
COMMIT;
