\set ON_ERROR_STOP on
BEGIN;
COMMENT ON COLUMN public.customers.city IS
  'Customer city used for geographic analysis.';
COMMENT ON COLUMN public.products.category IS
  'Product category used to group product and order-item revenue.';
COMMENT ON COLUMN public.orders.status IS
  'Order lifecycle state. completed means the order contributes to completed-order sales; cancelled means it does not.';
COMMENT ON COLUMN public.payments.payment_method IS
  'Method used to make the payment.';
COMMENT ON COLUMN public.payments.status IS
  'Payment processing state. captured means the payment was successfully captured. Payment status values are distinct from order status values.';
COMMENT ON COLUMN public.order_items.unit_price IS
  'Product price recorded for one unit on this order item.';
COMMIT;
