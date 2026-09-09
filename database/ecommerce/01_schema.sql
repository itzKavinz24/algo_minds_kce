\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SELECT pg_advisory_xact_lock(81723001);
DO $$
BEGIN
 IF current_database() <> 'ecommerce_db' THEN RAISE EXCEPTION 'Connect to ecommerce_db'; END IF;
 -- An existing unreviewed schema is not a migration target for this bootstrap.
 IF EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public'
            AND c.relname IN ('customers','products','orders','order_items','payments')
            AND obj_description(c.oid,'pg_class') IS DISTINCT FROM 'agentverse ecommerce v1')
 THEN RAISE EXCEPTION 'Existing unmanaged E-Commerce relations found. Run 00_inspect.sql and review a migration; no changes made.';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.customers (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 full_name text NOT NULL,
 email text NOT NULL UNIQUE,
 city text NOT NULL,
 state text NOT NULL DEFAULT 'Tamil Nadu',
 country_code char(2) NOT NULL DEFAULT 'IN',
 created_at timestamptz NOT NULL DEFAULT current_timestamp
);
CREATE TABLE IF NOT EXISTS public.products (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sku text NOT NULL UNIQUE,
 name text NOT NULL,
 category text NOT NULL,
 unit_price numeric(12,2) NOT NULL CHECK (unit_price > 0),
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.orders (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_number text NOT NULL UNIQUE,
 customer_id bigint NOT NULL CONSTRAINT fk_order_customer REFERENCES public.customers(id),
 ordered_at timestamptz NOT NULL,
 status text NOT NULL CHECK (status IN ('completed','cancelled','pending')),
 currency char(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR')
);
CREATE TABLE IF NOT EXISTS public.order_items (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id bigint NOT NULL REFERENCES public.orders(id),
 product_id bigint NOT NULL REFERENCES public.products(id),
 quantity integer NOT NULL CHECK (quantity > 0),
 unit_price numeric(12,2) NOT NULL CHECK (unit_price > 0),
 discount_amount numeric(12,2) NOT NULL DEFAULT 0,
 UNIQUE (order_id, product_id),
 CHECK (discount_amount >= 0 AND discount_amount < quantity * unit_price)
);
CREATE TABLE IF NOT EXISTS public.payments (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 payment_reference text NOT NULL UNIQUE,
 order_id bigint NOT NULL REFERENCES public.orders(id),
 paid_at timestamptz NOT NULL,
 amount numeric(12,2) NOT NULL CHECK (amount > 0),
 method text NOT NULL CHECK (method IN ('UPI','card','netbanking','cash_on_delivery')),
 status text NOT NULL CHECK (status IN ('captured','failed','pending'))
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(ordered_at);
CREATE INDEX IF NOT EXISTS idx_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
COMMENT ON TABLE public.customers IS 'agentverse ecommerce v1';
COMMENT ON TABLE public.products IS 'agentverse ecommerce v1';
COMMENT ON TABLE public.orders IS 'agentverse ecommerce v1';
COMMENT ON TABLE public.order_items IS 'agentverse ecommerce v1';
COMMENT ON TABLE public.payments IS 'agentverse ecommerce v1';
COMMENT ON COLUMN public.products.category IS 'Product category dimension; one category per product.';
COMMENT ON COLUMN public.order_items.unit_price IS 'INR price captured at order time; independent of current catalog price.';
COMMENT ON COLUMN public.order_items.discount_amount IS 'Total INR discount on this line, not per unit.';
COMMENT ON COLUMN public.orders.ordered_at IS 'Sales reporting date for completed orders; report in Asia/Kolkata.';
COMMENT ON COLUMN public.payments.order_id IS 'Multiple payment attempts permitted; aggregate separately from order lines.';
COMMIT;
