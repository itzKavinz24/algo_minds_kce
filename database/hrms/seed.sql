\set ON_ERROR_STOP on
BEGIN; SELECT pg_advisory_xact_lock(81723102);
TRUNCATE employee_training,training_programs,employee_skills,performance_reviews,payroll,leaves,leave_types,attendance,employees,designations,departments RESTART IDENTITY CASCADE;
INSERT INTO departments(department_code,department_name,location)
SELECT 'D'||lpad(n::text,2,'0'),(ARRAY['Engineering','Sales','Finance','Human Resources','Operations','Marketing','Customer Success','Quality Assurance','Procurement','Data & Analytics','Legal','Administration']) [n],
(ARRAY['Chennai','Coimbatore','Bengaluru','Chennai','Madurai','Chennai','Coimbatore','Salem','Tiruppur','Chennai','Chennai','Trichy'])[n] FROM generate_series(1,12)n;
INSERT INTO designations(designation_name,level,department_id)
SELECT title,level,d.department_id FROM departments d CROSS JOIN (VALUES('Associate',2),('Senior Associate',3),('Manager',5))v(title,level);
INSERT INTO employees(employee_code,first_name,last_name,email,phone,date_of_birth,gender,hire_date,department_id,designation_id,employment_type,employment_status,location,salary)
SELECT 'EMP'||lpad(n::text,4,'0'),
(ARRAY['Arun','Priya','Karthik','Divya','Senthil','Meena','Vignesh','Nandhini','Balaji','Janani','Prakash','Lakshmi'])[(n-1)%12+1],
(ARRAY['Kumar','Raman','Iyer','Murugan','Selvam','Krishnan','Ganesan','Sundaram'])[(n-1)%8+1],
'employee'||lpad(n::text,4,'0')||'@agentverse.example','9'||lpad((700000000+n)::text,9,'0'),current_date-(22+n%25)*interval '1 year',
(ARRAY['Female','Male','Male','Female'])[(n-1)%4+1],current_date-(90+n%1900),d.department_id,
(SELECT designation_id FROM designations x WHERE x.department_id=d.department_id ORDER BY level LIMIT 1 OFFSET CASE WHEN n%15=0 THEN 2 WHEN n%4=0 THEN 1 ELSE 0 END),
CASE WHEN n%17=0 THEN 'Contract' WHEN n%41=0 THEN 'Intern' ELSE 'Permanent' END,
CASE WHEN n%19=0 THEN 'Resigned' WHEN n%37=0 THEN 'On Leave' ELSE 'Active' END,d.location,300000+(n%12)*65000+(n%5)*9000
FROM generate_series(1,240)n JOIN departments d ON d.department_id=1+(n-1)%12;
UPDATE employees e SET manager_id=m.employee_id FROM (SELECT DISTINCT ON(department_id) employee_id,department_id FROM employees ORDER BY department_id,salary DESC) m WHERE m.department_id=e.department_id AND e.employee_id<>m.employee_id;
UPDATE departments d SET department_head_id=(SELECT employee_id FROM employees e WHERE e.department_id=d.department_id ORDER BY salary DESC LIMIT 1);
INSERT INTO leave_types(leave_name,description,annual_allocation) VALUES ('Casual Leave','Personal short leave',12),('Sick Leave','Medical absence',10),('Earned Leave','Planned annual leave',18),('Parental Leave','Parental care leave',90);
INSERT INTO attendance(employee_id,attendance_date,check_in,check_out,work_hours,status,overtime_hours)
SELECT e.employee_id,day::date,CASE WHEN k%13=0 THEN NULL ELSE time '09:00'+((k%40)||' minutes')::interval END,
CASE WHEN k%13=0 THEN NULL ELSE time '17:30'+((k%90)||' minutes')::interval END,
CASE WHEN k%13=0 THEN 0 ELSE 8+(k%20)/10.0 END,CASE WHEN k%31=0 THEN 'Leave' WHEN k%13=0 THEN 'Absent' WHEN k%7=0 THEN 'Remote' ELSE 'Present' END,
CASE WHEN k%9=0 THEN 1.5 ELSE 0 END
FROM employees e CROSS JOIN generate_series(current_date-interval '365 days',current_date-interval '1 day',interval '1 day')day
CROSS JOIN LATERAL (SELECT (e.employee_id+extract(doy from day))::int k)z WHERE extract(isodow from day)<6 AND day::date>=e.hire_date;
INSERT INTO leaves(employee_id,leave_type_id,start_date,end_date,total_days,reason,status,approved_by,created_at)
SELECT e.employee_id,1+(n%4),current_date-(n%330),current_date-(n%330)+(n%3),1+(n%3),'Planned employee leave',
CASE WHEN n%11=0 THEN 'Rejected' WHEN n%7=0 THEN 'Pending' ELSE 'Approved' END,(SELECT department_head_id FROM departments WHERE department_id=e.department_id),now()-(n||' days')::interval
FROM generate_series(1,320)n JOIN employees e ON e.employee_id=1+(n*7)%240;
INSERT INTO payroll(employee_id,pay_period,basic_salary,allowances,bonus,deductions,tax,net_salary,payment_date,payment_status)
SELECT e.employee_id,m::date,e.salary/12,e.salary/120,CASE WHEN extract(month from m)=3 THEN e.salary/60 ELSE 0 END,e.salary/240,e.salary/144,
e.salary/12+e.salary/120+CASE WHEN extract(month from m)=3 THEN e.salary/60 ELSE 0 END-e.salary/240-e.salary/144,(m+interval '1 month - 1 day')::date,'Paid'
FROM employees e CROSS JOIN generate_series(date_trunc('month',current_date)-interval '11 months',date_trunc('month',current_date),interval '1 month')m WHERE m::date>=date_trunc('month',e.hire_date);
INSERT INTO performance_reviews(employee_id,reviewer_id,review_period,rating,goals_score,performance_score,comments,review_date)
SELECT e.employee_id,coalesce(e.manager_id,e.employee_id),'FY-'||extract(year from current_date)::int,2.5+(e.employee_id%6)*.5,65+(e.employee_id%31),68+(e.employee_id%29),'Annual performance review',current_date-(e.employee_id%90)::integer
FROM employees e;
INSERT INTO employee_skills(employee_id,skill_name,proficiency_level,years_experience)
SELECT e.employee_id,(ARRAY['SQL','JavaScript','PostgreSQL','Salesforce','Financial Analysis','Project Management','Customer Support','Supply Chain'])[(e.employee_id+s-2)%8+1],
(ARRAY['Beginner','Intermediate','Advanced','Expert'])[(e.employee_id+s-2)%4+1],1+(e.employee_id%10) FROM employees e CROSS JOIN generate_series(1,2)s;
INSERT INTO training_programs(training_name,category,trainer,start_date,end_date,cost)
SELECT 'Enterprise Training '||n,(ARRAY['Technical','Leadership','Compliance','Domain'])[(n-1)%4+1],'Trainer '||n,current_date-(n*12),current_date-(n*12)+2,15000+n*1250 FROM generate_series(1,20)n;
INSERT INTO employee_training(employee_id,training_id,enrollment_date,completion_status,score)
SELECT e.employee_id,t.training_id,t.start_date-7,CASE WHEN (e.employee_id+t.training_id)%7=0 THEN 'In Progress' ELSE 'Completed' END,
CASE WHEN (e.employee_id+t.training_id)%7=0 THEN NULL ELSE 60+(e.employee_id+t.training_id)%40 END
FROM employees e JOIN training_programs t ON t.training_id=1+(e.employee_id%20) UNION ALL
SELECT e.employee_id,t.training_id,t.start_date-7,'Completed',70+(e.employee_id%30) FROM employees e JOIN training_programs t ON t.training_id=1+((e.employee_id+7)%20);
COMMIT;
