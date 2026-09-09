\set ON_ERROR_STOP on
BEGIN; SELECT pg_advisory_xact_lock(81723302);
TRUNCATE shipments,payments,invoices,sales_order_items,sales_orders,purchase_order_items,purchase_orders,inventory,expenses,customers,warehouses,products,suppliers RESTART IDENTITY CASCADE;
INSERT INTO suppliers(supplier_code,supplier_name,contact_person,email,phone,address,city,state,payment_terms,rating,status)
SELECT 'SUP'||lpad(n::text,4,'0'),(ARRAY['Kaveri Components','Southern Textiles','Deccan Packaging','Marina Foods','Nilgiri Industrial'])[(n-1)%5+1]||' '||n,'Contact '||n,'supplier'||n||'@agentverse.example','9'||lpad((400000000+n)::text,9,'0'),'Industrial Estate',(ARRAY['Chennai','Coimbatore','Madurai','Salem','Tiruppur'])[(n-1)%5+1],'Tamil Nadu',(ARRAY['Net 15','Net 30','Net 45','Advance'])[(n-1)%4+1],2.5+(n%6)*.5,CASE WHEN n%23=0 THEN 'Inactive' ELSE 'Active' END FROM generate_series(1,75)n;
INSERT INTO products(product_code,product_name,category,unit,cost_price,selling_price,reorder_level,status)
SELECT 'ERP-P'||lpad(n::text,4,'0'),(ARRAY['Industrial Motor','Cotton Fabric','Packaging Carton','Safety Gloves','Steel Fastener','Control Panel','Office Chair','Cleaning Solution'])[(n-1)%8+1]||' '||n,(ARRAY['Machinery','Textiles','Packaging','Safety','Components','Electrical','Office','Consumables'])[(n-1)%8+1],(ARRAY['Unit','Metre','Box','Pair'])[(n-1)%4+1],250+(n%30)*175,(250+(n%30)*175)*1.35,20+(n%10)*5,CASE WHEN n%53=0 THEN 'Discontinued' ELSE 'Active' END FROM generate_series(1,200)n;
INSERT INTO warehouses(warehouse_code,warehouse_name,location,city,capacity,manager_name)
SELECT 'WH'||lpad(n::text,2,'0'),'Regional Warehouse '||n,'Industrial Zone',(ARRAY['Chennai','Coimbatore','Madurai','Salem','Trichy','Tiruppur','Erode','Thoothukudi'])[(n-1)%8+1],20000+n*2500,'Warehouse Manager '||n FROM generate_series(1,10)n;
INSERT INTO inventory(product_id,warehouse_id,quantity_on_hand,reserved_quantity,reorder_level,last_updated)
SELECT p.product_id,w.warehouse_id,q.qty,(p.product_id+w.warehouse_id)%least(20,q.qty+1),p.reorder_level,now() FROM products p CROSS JOIN warehouses w CROSS JOIN LATERAL(SELECT CASE WHEN (p.product_id+w.warehouse_id)%13=0 THEN 10 ELSE 40+(p.product_id*7+w.warehouse_id*11)%400 END qty)q;
INSERT INTO customers(customer_code,customer_name,industry,city,state,credit_limit,status)
SELECT 'ERP-C'||lpad(n::text,4,'0'),(ARRAY['Annamalai','Cauvery','Marina','Vaigai','Nilgiri'])[(n-1)%5+1]||' '||(ARRAY['Industries','Retail','Exports','Engineering','Foods'])[(n-1)%5+1]||' '||n,(ARRAY['Manufacturing','Retail','Exports','Engineering','Food Processing'])[(n-1)%5+1],(ARRAY['Chennai','Coimbatore','Madurai','Salem','Trichy'])[(n-1)%5+1],'Tamil Nadu',500000+(n%20)*100000,CASE WHEN n%29=0 THEN 'Credit Hold' ELSE 'Active' END FROM generate_series(1,350)n;
INSERT INTO purchase_orders(po_number,supplier_id,warehouse_id,order_date,expected_delivery_date,actual_delivery_date,subtotal,tax,total_amount,status)
SELECT 'PO'||lpad(n::text,5,'0'),1+(n*7)%75,1+n%10,current_date-(n%365),current_date-(n%365)+10,CASE WHEN n%7<>0 THEN current_date-(n%365)+8+(n%6) END,0,0,0,CASE WHEN n%19=0 THEN 'Cancelled' WHEN n%7=0 THEN 'Ordered' ELSE 'Received' END FROM generate_series(1,360)n;
INSERT INTO purchase_order_items(purchase_order_id,product_id,quantity,unit_cost,total_cost)
SELECT po.purchase_order_id,p.product_id,10+(po.purchase_order_id+s)%50,p.cost_price,(10+(po.purchase_order_id+s)%50)*p.cost_price FROM purchase_orders po CROSS JOIN generate_series(1,3)s JOIN products p ON p.product_id=1+((po.purchase_order_id*3+s)%200);
UPDATE purchase_orders po SET subtotal=x.s,tax=round(x.s*.18,2),total_amount=round(x.s*1.18,2) FROM(SELECT purchase_order_id,sum(total_cost)s FROM purchase_order_items GROUP BY 1)x WHERE x.purchase_order_id=po.purchase_order_id;
INSERT INTO sales_orders(order_number,customer_id,customer_name,order_date,warehouse_id,subtotal,tax,discount,total_amount,payment_status,order_status)
SELECT 'SO'||lpad(n::text,5,'0'),c.customer_id,c.customer_name,current_date-(n%365),1+n%10,0,0,0,0,
CASE WHEN n%9=0 THEN 'Pending' WHEN n%7=0 THEN 'Partially Paid' ELSE 'Paid' END,CASE WHEN n%23=0 THEN 'Cancelled' WHEN n%11=0 THEN 'Processing' WHEN n%5=0 THEN 'Shipped' ELSE 'Delivered' END FROM generate_series(1,650)n JOIN customers c ON c.customer_id=1+(n*11)%350;
INSERT INTO sales_order_items(sales_order_id,product_id,quantity,unit_price,discount,total)
SELECT so.sales_order_id,p.product_id,1+(so.sales_order_id+s)%12,p.selling_price,CASE WHEN s=3 THEN p.selling_price*.05 ELSE 0 END,(1+(so.sales_order_id+s)%12)*p.selling_price-CASE WHEN s=3 THEN p.selling_price*.05 ELSE 0 END FROM sales_orders so CROSS JOIN generate_series(1,3)s JOIN products p ON p.product_id=1+((so.sales_order_id*5+s)%200);
UPDATE sales_orders so SET subtotal=x.s,discount=x.d,tax=round((x.s-x.d)*.18,2),total_amount=round((x.s-x.d)*1.18,2) FROM(SELECT sales_order_id,sum(quantity*unit_price)s,sum(discount)d FROM sales_order_items GROUP BY 1)x WHERE x.sales_order_id=so.sales_order_id;
INSERT INTO invoices(invoice_number,sales_order_id,invoice_date,due_date,subtotal,tax,total_amount,paid_amount,outstanding_amount,payment_status)
SELECT 'INV'||lpad(so.sales_order_id::text,5,'0'),so.sales_order_id,so.order_date,so.order_date+30,so.subtotal,so.tax,so.total_amount,
CASE WHEN so.payment_status='Paid' THEN so.total_amount WHEN so.payment_status='Partially Paid' THEN round(so.total_amount*.5,2) ELSE 0 END,
CASE WHEN so.payment_status='Paid' THEN 0 WHEN so.payment_status='Partially Paid' THEN so.total_amount-round(so.total_amount*.5,2) ELSE so.total_amount END,
CASE WHEN so.payment_status='Paid' THEN 'Paid' WHEN so.payment_status='Partially Paid' THEN 'Partially Paid' WHEN so.order_date+30<current_date THEN 'Overdue' ELSE 'Unpaid' END FROM sales_orders so WHERE so.order_status<>'Cancelled';
INSERT INTO payments(invoice_id,payment_date,amount,payment_method,transaction_reference,status)
SELECT i.invoice_id,least(current_date,i.invoice_date+7),i.paid_amount,(ARRAY['UPI','Bank Transfer','Card','Cheque'])[(i.invoice_id-1)%4+1],'TXN'||lpad(i.invoice_id::text,8,'0'),'Captured' FROM invoices i WHERE i.paid_amount>0;
INSERT INTO expenses(expense_category,department,description,amount,expense_date,approved_by,status)
SELECT (ARRAY['Utilities','Travel','Maintenance','Software','Rent','Marketing'])[(n-1)%6+1],(ARRAY['Operations','Sales','IT','Finance'])[(n-1)%4+1],'Operational expense '||n,5000+(n%40)*1750,current_date-(n%365),'Approver '||(n%12+1),CASE WHEN n%13=0 THEN 'Submitted' WHEN n%17=0 THEN 'Rejected' ELSE 'Paid' END FROM generate_series(1,300)n;
INSERT INTO shipments(shipment_number,sales_order_id,warehouse_id,shipment_date,expected_delivery_date,actual_delivery_date,carrier,tracking_number,shipping_status)
SELECT 'SHP'||lpad(so.sales_order_id::text,5,'0'),so.sales_order_id,so.warehouse_id,so.order_date+1,so.order_date+6,
CASE WHEN so.order_status IN('Delivered','Shipped') THEN so.order_date+5+(so.sales_order_id%4)::integer END,(ARRAY['Blue Dart','Delhivery','DTDC','Ecom Express'])[((so.sales_order_id-1)%4+1)::integer],'TRK'||lpad(so.sales_order_id::text,8,'0'),
CASE WHEN so.order_status='Delivered' THEN CASE WHEN so.sales_order_id%17=0 THEN 'Delayed' ELSE 'Delivered' END WHEN so.order_status='Shipped' THEN 'In Transit' ELSE 'Preparing' END FROM sales_orders so WHERE so.order_status<>'Cancelled';
COMMIT;
