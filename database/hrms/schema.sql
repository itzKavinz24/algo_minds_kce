\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(81723101);
CREATE TABLE IF NOT EXISTS departments (
 department_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, department_code text UNIQUE NOT NULL,
 department_name text NOT NULL, department_head_id bigint, location text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS designations (
 designation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, designation_name text NOT NULL,
 level integer NOT NULL CHECK(level BETWEEN 1 AND 10), department_id bigint NOT NULL REFERENCES departments,
 UNIQUE(department_id,designation_name));
CREATE TABLE IF NOT EXISTS employees (
 employee_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, employee_code text UNIQUE NOT NULL,
 first_name text NOT NULL,last_name text NOT NULL,email text UNIQUE NOT NULL,phone text,date_of_birth date,
 gender text CHECK(gender IN ('Female','Male','Non-binary')),hire_date date NOT NULL,
 department_id bigint NOT NULL REFERENCES departments,designation_id bigint NOT NULL REFERENCES designations,
 manager_id bigint REFERENCES employees,employment_type text NOT NULL CHECK(employment_type IN ('Permanent','Contract','Intern')),
 employment_status text NOT NULL CHECK(employment_status IN ('Active','Resigned','On Leave')),
 location text NOT NULL,salary numeric(12,2) NOT NULL CHECK(salary>0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_department_head;
ALTER TABLE departments ADD CONSTRAINT fk_department_head FOREIGN KEY(department_head_id) REFERENCES employees(employee_id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE IF NOT EXISTS attendance (
 attendance_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,employee_id bigint NOT NULL REFERENCES employees,
 attendance_date date NOT NULL,check_in time,check_out time,work_hours numeric(4,2) CHECK(work_hours BETWEEN 0 AND 24),
 status text NOT NULL CHECK(status IN ('Present','Absent','Remote','Leave','Holiday')),overtime_hours numeric(4,2) NOT NULL DEFAULT 0 CHECK(overtime_hours BETWEEN 0 AND 12),UNIQUE(employee_id,attendance_date));
CREATE TABLE IF NOT EXISTS leave_types (
 leave_type_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,leave_name text UNIQUE NOT NULL,description text,annual_allocation integer NOT NULL CHECK(annual_allocation>=0));
CREATE TABLE IF NOT EXISTS leaves (
 leave_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,employee_id bigint NOT NULL REFERENCES employees,leave_type_id bigint NOT NULL REFERENCES leave_types,
 start_date date NOT NULL,end_date date NOT NULL,total_days numeric(5,1) NOT NULL CHECK(total_days>0),reason text,
 status text NOT NULL CHECK(status IN ('Pending','Approved','Rejected','Cancelled')),approved_by bigint REFERENCES employees,created_at timestamptz NOT NULL DEFAULT now(),CHECK(end_date>=start_date));
CREATE TABLE IF NOT EXISTS payroll (
 payroll_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,employee_id bigint NOT NULL REFERENCES employees,pay_period date NOT NULL,
 basic_salary numeric(12,2) NOT NULL,allowances numeric(12,2) NOT NULL,bonus numeric(12,2) NOT NULL DEFAULT 0,deductions numeric(12,2) NOT NULL,tax numeric(12,2) NOT NULL,
 net_salary numeric(12,2) NOT NULL,payment_date date,payment_status text NOT NULL CHECK(payment_status IN ('Paid','Processing','On Hold')),UNIQUE(employee_id,pay_period));
CREATE TABLE IF NOT EXISTS performance_reviews (
 review_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,employee_id bigint NOT NULL REFERENCES employees,reviewer_id bigint NOT NULL REFERENCES employees,
 review_period text NOT NULL,rating numeric(2,1) CHECK(rating BETWEEN 1 AND 5),goals_score integer CHECK(goals_score BETWEEN 0 AND 100),performance_score integer CHECK(performance_score BETWEEN 0 AND 100),comments text,review_date date NOT NULL,UNIQUE(employee_id,review_period));
CREATE TABLE IF NOT EXISTS employee_skills (
 employee_skill_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,employee_id bigint NOT NULL REFERENCES employees,skill_name text NOT NULL,
 proficiency_level text NOT NULL CHECK(proficiency_level IN ('Beginner','Intermediate','Advanced','Expert')),years_experience numeric(4,1) CHECK(years_experience>=0),UNIQUE(employee_id,skill_name));
CREATE TABLE IF NOT EXISTS training_programs (
 training_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,training_name text UNIQUE NOT NULL,category text NOT NULL,trainer text NOT NULL,start_date date NOT NULL,end_date date NOT NULL,cost numeric(12,2) CHECK(cost>=0),CHECK(end_date>=start_date));
CREATE TABLE IF NOT EXISTS employee_training (
 employee_training_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,employee_id bigint NOT NULL REFERENCES employees,training_id bigint NOT NULL REFERENCES training_programs,
 enrollment_date date NOT NULL,completion_status text NOT NULL CHECK(completion_status IN ('Enrolled','In Progress','Completed','Dropped')),score numeric(5,2) CHECK(score BETWEEN 0 AND 100),UNIQUE(employee_id,training_id));
CREATE INDEX IF NOT EXISTS idx_employee_department_status ON employees(department_id,employment_status);
CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance(attendance_date,status);
CREATE INDEX IF NOT EXISTS idx_leaves_employee_status ON leaves(employee_id,status);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(pay_period);
CREATE INDEX IF NOT EXISTS idx_reviews_period ON performance_reviews(review_period);
COMMENT ON COLUMN employees.employment_status IS 'Current workforce status; Active employees count toward current headcount.';
COMMENT ON COLUMN attendance.status IS 'Daily attendance classification.';
COMMENT ON COLUMN payroll.net_salary IS 'Final salary amount after additions, deductions, and tax.';
COMMIT;
