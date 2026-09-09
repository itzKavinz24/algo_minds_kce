\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT relname table_name,n_live_tup estimated_rows FROM pg_stat_user_tables ORDER BY relname;
SELECT count(*) orphan_attendance FROM attendance a LEFT JOIN employees e USING(employee_id) WHERE e.employee_id IS NULL;
SELECT d.department_name,count(*) employees,round(avg(e.salary),2) average_salary FROM employees e JOIN departments d USING(department_id) GROUP BY 1 ORDER BY 2 DESC;
SELECT date_trunc('month',pay_period)::date month,round(sum(net_salary),2) payroll_cost FROM payroll GROUP BY 1 ORDER BY 1;
COMMIT;
