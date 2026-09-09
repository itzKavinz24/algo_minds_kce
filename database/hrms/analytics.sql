SELECT d.department_name,count(*) FILTER(WHERE e.employment_status='Active') headcount,round(avg(e.salary),2) average_salary FROM employees e JOIN departments d USING(department_id) GROUP BY 1 ORDER BY headcount DESC;
SELECT attendance_date,count(*) FILTER(WHERE status IN('Present','Remote'))::numeric/count(*) attendance_rate,round(sum(overtime_hours),2) overtime_hours FROM attendance GROUP BY 1 ORDER BY 1;
SELECT date_trunc('month',pay_period)::date month,round(sum(net_salary),2) payroll_cost FROM payroll GROUP BY 1 ORDER BY 1;
