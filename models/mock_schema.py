"""Mock database schemas for offline development and testing."""

from models.schemas import DatabaseSchema, Relationship, TableMetadata

# E-Commerce domain schema
ECOMMERCE_SCHEMA = DatabaseSchema(
    tables={
        "customers": TableMetadata(
            name="customers",
            columns=["customer_id", "customer_name", "email", "region", "signup_date"],
            description="Customer profiles and geographical region",
            primary_key="customer_id",
        ),
        "products": TableMetadata(
            name="products",
            columns=["product_id", "product_name", "category", "price", "cost"],
            description="Product catalog and categorization",
            primary_key="product_id",
        ),
        "orders": TableMetadata(
            name="orders",
            columns=["order_id", "customer_id", "order_date", "total_amount", "status"],
            description="Order header records containing transaction totals and status",
            primary_key="order_id",
        ),
        "order_items": TableMetadata(
            name="order_items",
            columns=["item_id", "order_id", "product_id", "quantity", "unit_price"],
            description="Line items for each order linking to products",
            primary_key="item_id",
        ),
        "payments": TableMetadata(
            name="payments",
            columns=["payment_id", "order_id", "payment_method", "payment_date", "amount", "status"],
            description="Payment transactions associated with orders",
            primary_key="payment_id",
        ),
    },
    relationships=[
        Relationship(from_table="orders", from_column="customer_id", to_table="customers", to_column="customer_id"),
        Relationship(from_table="order_items", from_column="order_id", to_table="orders", to_column="order_id"),
        Relationship(from_table="order_items", from_column="product_id", to_table="products", to_column="product_id"),
        Relationship(from_table="payments", from_column="order_id", to_table="orders", to_column="order_id"),
    ],
)

# HRMS domain schema
HRMS_SCHEMA = DatabaseSchema(
    tables={
        "employees": TableMetadata(
            name="employees",
            columns=["employee_id", "first_name", "last_name", "email", "department_id", "role", "salary", "hire_date", "status"],
            description="Employee master records",
            primary_key="employee_id",
        ),
        "departments": TableMetadata(
            name="departments",
            columns=["department_id", "department_name", "manager_id", "location"],
            description="Department organization units",
            primary_key="department_id",
        ),
        "attendance": TableMetadata(
            name="attendance",
            columns=["attendance_id", "employee_id", "date", "status", "hours_worked"],
            description="Daily employee attendance logs",
            primary_key="attendance_id",
        ),
        "leave_requests": TableMetadata(
            name="leave_requests",
            columns=["leave_id", "employee_id", "leave_type", "start_date", "end_date", "status"],
            description="Time-off and leave applications",
            primary_key="leave_id",
        ),
        "payroll": TableMetadata(
            name="payroll",
            columns=["payroll_id", "employee_id", "month", "year", "base_salary", "bonus", "deductions", "net_pay"],
            description="Monthly compensation and payroll records",
            primary_key="payroll_id",
        ),
    },
    relationships=[
        Relationship(from_table="employees", from_column="department_id", to_table="departments", to_column="department_id"),
        Relationship(from_table="attendance", from_column="employee_id", to_table="employees", to_column="employee_id"),
        Relationship(from_table="leave_requests", from_column="employee_id", to_table="employees", to_column="employee_id"),
        Relationship(from_table="payroll", from_column="employee_id", to_table="employees", to_column="employee_id"),
    ],
)


def get_mock_schema_by_domain(domain: str) -> DatabaseSchema:
    """Retrieve corresponding mock database schema based on domain."""
    normalized = domain.lower().strip()
    if normalized in ("hr", "hrms", "employee", "human_resources"):
        return HRMS_SCHEMA
    return ECOMMERCE_SCHEMA
