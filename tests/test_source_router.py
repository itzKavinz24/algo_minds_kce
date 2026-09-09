"""Tests for schema-aware single- and multi-source selection."""

import unittest

from orchestrator.source_router import SourceRouter


TABLES = {
    "ecommerce_db": ["customers", "orders", "order_items", "payments", "products"],
    "hrms_db": ["employees", "attendance", "payroll", "performance_reviews"],
    "crm_db": ["sales_representatives", "opportunities", "leads", "customers"],
    "erp_db": ["inventory", "suppliers", "warehouses", "shipments", "invoices"],
}


class TestSourceRouter(unittest.TestCase):
    def setUp(self):
        self.router = SourceRouter()

    def test_employee_sales_performance_routes_to_crm(self):
        result = self.router.select(
            "Which employees have the highest sales performance?", TABLES,
        )
        self.assertEqual(result, ["crm_db"])

    def test_hr_question_routes_to_hrms(self):
        result = self.router.select("Show attendance by department", TABLES)
        self.assertEqual(result, ["hrms_db"])

    def test_inventory_question_routes_to_erp(self):
        result = self.router.select("Show inventory by warehouse", TABLES)
        self.assertEqual(result, ["erp_db"])

    def test_explicit_cross_system_question_selects_multiple_sources(self):
        result = self.router.select(
            "Compare CRM sales performance with HR performance reviews across systems",
            TABLES,
        )
        self.assertEqual(set(result), {"crm_db", "hrms_db"})

    def test_unknown_business_question_preserves_ecommerce_default(self):
        result = self.router.select("Show overall business results", TABLES)
        self.assertEqual(result, ["ecommerce_db"])


if __name__ == "__main__":
    unittest.main()

