\set ON_ERROR_STOP on
BEGIN; SELECT pg_advisory_xact_lock(81723202);
TRUNCATE customer_tickets,quote_items,quotes,activities,customer_contacts,opportunities,leads,products,customers,sales_representatives RESTART IDENTITY CASCADE;
INSERT INTO sales_representatives(employee_code,name,email,territory,region,target_amount,status)
SELECT 'SR'||lpad(n::text,3,'0'),(ARRAY['Ananya Rao','Vikram Kumar','Deepa Nair','Arjun Iyer','Harini Selvam','Rahul Menon'])[(n-1)%6+1]||' '||n,'sales'||n||'@agentverse.example',(ARRAY['Chennai','Coimbatore','Madurai','Bengaluru','Hyderabad','Kochi'])[(n-1)%6+1],(ARRAY['Tamil Nadu','Tamil Nadu','Tamil Nadu','Karnataka','Telangana','Kerala'])[(n-1)%6+1],7500000+(n%5)*1000000,CASE WHEN n=24 THEN 'Inactive' ELSE 'Active' END FROM generate_series(1,24)n;
INSERT INTO customers(customer_code,first_name,last_name,company_name,email,phone,industry,customer_type,city,state,acquisition_channel,customer_status,created_at)
SELECT 'CUS'||lpad(n::text,5,'0'),(ARRAY['Arun','Priya','Karthik','Meena','Vignesh','Divya'])[(n-1)%6+1],(ARRAY['Kumar','Raman','Iyer','Nair','Reddy'])[(n-1)%5+1],
(ARRAY['Kaveri','Vaigai','Marina','Nilgiri','Cauvery','Coromandel'])[(n-1)%6+1]||' '||(ARRAY['Technologies','Textiles','Foods','Logistics','Healthcare','Industries'])[(n-1)%6+1]||' '||n,
'customer'||n||'@agentverse.example','9'||lpad((600000000+n)::text,9,'0'),(ARRAY['Technology','Manufacturing','Retail','Healthcare','Financial Services','Logistics','Education','Textiles'])[(n-1)%8+1],
(ARRAY['SMB','SMB','Mid-Market','Enterprise'])[(n-1)%4+1],(ARRAY['Chennai','Coimbatore','Madurai','Salem','Erode','Tiruppur','Trichy','Bengaluru'])[(n-1)%8+1],
(ARRAY['Tamil Nadu','Tamil Nadu','Tamil Nadu','Tamil Nadu','Tamil Nadu','Tamil Nadu','Tamil Nadu','Karnataka'])[(n-1)%8+1],(ARRAY['Organic','Referral','Partner','Events','Digital Ads'])[(n-1)%5+1],CASE WHEN n%17=0 THEN 'Inactive' ELSE 'Active' END,now()-(n%1000||' days')::interval FROM generate_series(1,600)n;
INSERT INTO leads(lead_code,first_name,last_name,company_name,email,phone,source,industry,assigned_to,lead_score,lead_status,created_at,converted_at)
SELECT 'LEAD'||lpad(n::text,5,'0'),'Lead'||n,'Contact',(ARRAY['Southern','Deccan','Lotus','Temple'])[(n-1)%4+1]||' Ventures '||n,'lead'||n||'@agentverse.example','8'||lpad((500000000+n)::text,9,'0'),
(ARRAY['Website','Referral','LinkedIn','Conference','Partner'])[(n-1)%5+1],(ARRAY['Technology','Manufacturing','Retail','Healthcare','Logistics'])[(n-1)%5+1],1+(n%24),30+(n*7)%71,
CASE WHEN n%5=0 THEN 'Converted' WHEN n%7=0 THEN 'Disqualified' WHEN n%3=0 THEN 'Qualified' WHEN n%2=0 THEN 'Contacted' ELSE 'New' END,now()-(n%500||' days')::interval,
CASE WHEN n%5=0 THEN now()-((n%500)-14||' days')::interval ELSE NULL END FROM generate_series(1,360)n;
INSERT INTO opportunities(opportunity_code,customer_id,sales_rep_id,opportunity_name,opportunity_stage,probability,estimated_value,expected_close_date,actual_close_date,status,created_at)
SELECT 'OPP'||lpad(n::text,5,'0'),1+(n*7)%600,1+n%24,'Enterprise solution '||n,
(ARRAY['Discovery','Qualification','Proposal','Negotiation','Closed Won','Closed Lost'])[(n-1)%6+1],(ARRAY[15,30,55,75,100,0])[(n-1)%6+1],150000+(n%40)*75000,current_date+(n%180)-60,
CASE WHEN n%6 IN(5,0) THEN current_date-(n%150) ELSE NULL END,CASE WHEN n%6=5 THEN 'Won' WHEN n%6=0 THEN 'Lost' ELSE 'Open' END,now()-(n%400||' days')::interval FROM generate_series(1,240)n;
INSERT INTO activities(customer_id,lead_id,opportunity_id,sales_rep_id,activity_type,subject,activity_date,duration_minutes,outcome,notes)
SELECT CASE WHEN n%3=0 THEN 1+(n%600) END,CASE WHEN n%3=1 THEN 1+(n%360) END,CASE WHEN n%3=2 THEN 1+(n%240) END,1+n%24,
(ARRAY['Call','Email','Meeting','Demo','Follow-up'])[(n-1)%5+1],'Customer engagement '||n,now()-(n%365||' days')::interval,10+(n%80),
(ARRAY['Positive','Follow-up needed','No response','Qualified'])[(n-1)%4+1],'Synthetic CRM activity' FROM generate_series(1,1800)n;
INSERT INTO customer_contacts(customer_id,contact_name,designation,email,phone,contact_role,is_primary)
SELECT c.customer_id,'Contact '||c.customer_id,'Decision Maker','contact'||c.customer_id||'@agentverse.example',NULL,'Business',true FROM customers c;
INSERT INTO products(product_code,product_name,category,description,unit_price,status)
SELECT 'CRM-P'||lpad(n::text,3,'0'),(ARRAY['Analytics Cloud','CRM Suite','Service Desk','Data Connector','Automation Pack'])[(n-1)%5+1]||' '||n,(ARRAY['Analytics','Sales','Support','Integration','Automation'])[(n-1)%5+1],'Enterprise software offering',50000+(n%12)*25000,'Active' FROM generate_series(1,60)n;
CREATE TEMP TABLE qlines ON COMMIT DROP AS SELECT n quote_no,1+(n*7)%240 opportunity_id,1+(n%24) rep_id,current_date-(n%330) qdate FROM generate_series(1,180)n;
INSERT INTO quotes(quote_number,customer_id,opportunity_id,sales_rep_id,quote_date,valid_until,subtotal,discount,tax,total_amount,status)
SELECT 'Q'||lpad(q.quote_no::text,5,'0'),o.customer_id,q.opportunity_id,q.rep_id,q.qdate,q.qdate+30,0,0,0,0,(ARRAY['Sent','Accepted','Rejected','Expired'])[(q.quote_no-1)%4+1] FROM qlines q JOIN opportunities o USING(opportunity_id);
INSERT INTO quote_items(quote_id,product_id,quantity,unit_price,discount,total)
SELECT q.quote_id,p.product_id,1+(q.quote_id+s)%5,p.unit_price,CASE WHEN s=3 THEN p.unit_price*.05 ELSE 0 END,(1+(q.quote_id+s)%5)*p.unit_price-CASE WHEN s=3 THEN p.unit_price*.05 ELSE 0 END
FROM quotes q CROSS JOIN generate_series(1,3)s JOIN products p ON p.product_id=1+((q.quote_id*3+s)%60);
UPDATE quotes q SET subtotal=x.subtotal,discount=x.discount,tax=round((x.subtotal-x.discount)*.18,2),total_amount=round((x.subtotal-x.discount)*1.18,2) FROM (SELECT quote_id,sum(quantity*unit_price)subtotal,sum(discount)discount FROM quote_items GROUP BY quote_id)x WHERE x.quote_id=q.quote_id;
INSERT INTO customer_tickets(ticket_number,customer_id,assigned_to,priority,category,subject,description,status,created_at,resolved_at)
SELECT 'TKT'||lpad(n::text,5,'0'),1+(n*11)%600,1+n%24,(ARRAY['Low','Medium','High','Critical'])[(n-1)%4+1],(ARRAY['Billing','Technical','Onboarding','Account'])[(n-1)%4+1],'Support request '||n,'Synthetic support case',
CASE WHEN n%5=0 THEN 'Open' WHEN n%7=0 THEN 'In Progress' WHEN n%2=0 THEN 'Resolved' ELSE 'Closed' END,now()-(n%300||' days')::interval,
CASE WHEN n%5<>0 AND n%7<>0 THEN now()-greatest((n%300)-3,0)*interval '1 day' END FROM generate_series(1,300)n;
COMMIT;
