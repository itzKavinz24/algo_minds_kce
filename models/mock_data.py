"""Mock analytical datasets for testing and offline development.

All datasets are clearly synthetic test-only fixtures.
"""

from typing import Any, Dict, List

# 1. Monthly Revenue Trend (12 Months)
MOCK_MONTHLY_REVENUE_TREND: List[Dict[str, Any]] = [
    {"month": "2023-01", "total_sales": 105000.0},
    {"month": "2023-02", "total_sales": 112000.0},
    {"month": "2023-03", "total_sales": 128000.0},
    {"month": "2023-04", "total_sales": 122000.0},
    {"month": "2023-05", "total_sales": 139000.0},
    {"month": "2023-06", "total_sales": 145000.0},
    {"month": "2023-07", "total_sales": 150000.0},
    {"month": "2023-08", "total_sales": 162000.0},
    {"month": "2023-09", "total_sales": 158000.0},
    {"month": "2023-10", "total_sales": 174000.0},
    {"month": "2023-11", "total_sales": 195000.0},
    {"month": "2023-12", "total_sales": 230000.0},
]

# 2. Revenue by Category
MOCK_REVENUE_BY_CATEGORY: List[Dict[str, Any]] = [
    {"category": "Electronics", "total_revenue": 850000.0},
    {"category": "Apparel", "total_revenue": 420000.0},
    {"category": "Home & Kitchen", "total_revenue": 290000.0},
    {"category": "Books", "total_revenue": 140000.0},
    {"category": "Beauty", "total_revenue": 95000.0},
]

# 3. Single KPI / Scalar Aggregate
MOCK_SINGLE_KPI_THIS_MONTH: List[Dict[str, Any]] = [
    {"total_revenue": 185250.0}
]

# 4. Employee Distribution by Department (HRMS)
MOCK_EMPLOYEE_DISTRIBUTION: List[Dict[str, Any]] = [
    {"department_name": "Engineering", "employee_count": 135},
    {"department_name": "Sales", "employee_count": 80},
    {"department_name": "Marketing", "employee_count": 45},
    {"department_name": "Customer Support", "employee_count": 35},
    {"department_name": "Finance", "employee_count": 25},
    {"department_name": "Human Resources", "employee_count": 18},
]

# 5. Declining Sales Scenario (for RCA & Anomaly Detection)
# Consistent with RCA Baseline: Oct ($1,000,000) -> Nov ($820,000), drop of -$180,000 (-18.0%)
MOCK_DECLINING_SALES_SCENARIO: List[Dict[str, Any]] = [
    {"month": "2023-08", "total_sales": 950000.0},
    {"month": "2023-09", "total_sales": 980000.0},
    {"month": "2023-10", "total_sales": 1000000.0},
    {"month": "2023-11", "total_sales": 820000.0},  # Sharp drop (-18.0%)
]

# Category Breakdown during the decline period
MOCK_CATEGORY_SALES_DURING_DECLINE: List[Dict[str, Any]] = [
    {"category": "Electronics", "previous_month_sales": 420000.0, "current_month_sales": 289000.0, "change_pct": -31.19},
    {"category": "Clothing", "previous_month_sales": 300000.0, "current_month_sales": 285000.0, "change_pct": -5.00},
    {"category": "Furniture", "previous_month_sales": 280000.0, "current_month_sales": 246000.0, "change_pct": -12.14},
]

# ==========================================
# RCA Flagship Benchmark Dataset
# Flagship Scenario: "Why did sales decrease last month?"
# Previous Month: $1,000,000 -> Current Month: $820,000 (Decline: -$180,000 / -18.0%)
# ==========================================

MOCK_RCA_BASELINE: List[Dict[str, Any]] = [
    {"period": "2023-10", "total_sales": 1000000.0},
    {"period": "2023-11", "total_sales": 820000.0},
]

# Evidence 1: Category Breakdown (Shows Electronics drove 72.78% of the total decline)
MOCK_RCA_EVIDENCE_CATEGORY: List[Dict[str, Any]] = [
    {
        "category": "Electronics",
        "previous_period_sales": 420000.0,
        "current_period_sales": 289000.0,
        "delta": -131000.0,
        "change_pct": -31.19,
    },
    {
        "category": "Clothing",
        "previous_period_sales": 300000.0,
        "current_period_sales": 285000.0,
        "delta": -15000.0,
        "change_pct": -5.00,
    },
    {
        "category": "Furniture",
        "previous_period_sales": 280000.0,
        "current_period_sales": 246000.0,
        "delta": -34000.0,
        "change_pct": -12.14,
    },
]

# Evidence 2: Regional Breakdown (Decline was uniform ~18% across regions, ruling out regional shock)
MOCK_RCA_EVIDENCE_REGION: List[Dict[str, Any]] = [
    {"region": "North", "previous_period_sales": 400000.0, "current_period_sales": 328000.0, "delta": -72000.0, "change_pct": -18.0},
    {"region": "South", "previous_period_sales": 350000.0, "current_period_sales": 287000.0, "delta": -63000.0, "change_pct": -18.0},
    {"region": "West", "previous_period_sales": 250000.0, "current_period_sales": 205000.0, "delta": -45000.0, "change_pct": -18.0},
]

# Evidence 3: Order Volume vs AOV
MOCK_RCA_EVIDENCE_VOLUME_AOV: List[Dict[str, Any]] = [
    {"metric": "Order Volume", "previous_period": 10000, "current_period": 9600, "change_pct": -4.0},
    {"metric": "Average Order Value (AOV)", "previous_period": 100.0, "current_period": 85.42, "change_pct": -14.58},
]

# Evidence 4: Order Cancellation Rate
MOCK_RCA_EVIDENCE_CANCELLATION: List[Dict[str, Any]] = [
    {"period": "2023-10", "total_orders": 10416, "cancelled_orders": 416, "cancellation_rate_pct": 4.0},
    {"period": "2023-11", "total_orders": 10105, "cancelled_orders": 505, "cancellation_rate_pct": 5.0},
]

