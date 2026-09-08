"""
Automated Contract Tests for Canonical AnalysisResult (v1.0).
Verifies the 11 contract requirements specified in Section 25 of the architecture audit.
"""

import sys
import unittest
from pathlib import Path
from pydantic import ValidationError

TEST_DIR = Path(__file__).resolve().parent
ROOT_DIR = TEST_DIR.parent
sys.path.insert(0, str(ROOT_DIR))

from app.models.analysis_result import (
    AnalysisResult,
    DataSourceInfo,
    ColumnSpec,
    QueryResult,
    AnalysisContent,
    ReportMetadata,
)
from app.services.validation_service import ValidationService


class TestCanonicalAnalysisResultContract(unittest.TestCase):
    """11 strict contract tests verifying independent AnalysisResult behavior."""

    # 1. Valid AnalysisResult
    def test_01_valid_contract(self):
        res = AnalysisResult(
            contract_version="1.0",
            business_question="What is total revenue this month?",
            query_result=QueryResult(
                columns=[ColumnSpec(name="revenue", data_type="numeric")],
                rows=[{"revenue": 2480000}],
                row_count=1,
            ),
            analysis=AnalysisContent(
                summary="Current month revenue is ₹24,80,000.",
                key_findings=["Revenue tracking 7.8% ahead of budget."],
                recommendations=["Maintain restocking cadence."]
            ),
        )
        self.assertEqual(res.contract_version, "1.0")
        self.assertTrue(res.report_id.startswith("RPT-"))
        self.assertIsNotNone(res.metadata.generated_at)
        is_valid, errors = ValidationService.validate(res)
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

    # 2. Missing business_question
    def test_02_missing_business_question(self):
        with self.assertRaises(ValidationError):
            AnalysisResult(
                business_question="",  # Invalid: min_length=2
                query_result=QueryResult(
                    columns=[ColumnSpec(name="x", data_type="text")],
                    rows=[{"x": "val"}]
                ),
                analysis=AnalysisContent(summary="Valid summary")
            )

    # 3. Missing query_result
    def test_03_missing_query_result(self):
        with self.assertRaises(ValidationError):
            AnalysisResult(
                business_question="Valid question",
                query_result=None,  # Required
                analysis=AnalysisContent(summary="Valid summary")
            )

    # 4. Invalid columns structure
    def test_04_invalid_columns(self):
        with self.assertRaises(ValidationError):
            QueryResult(
                columns=[{"name": ""}],  # Column name must have min_length=1
                rows=[{"": 123}]
            )

    # 5. Invalid rows structure
    def test_05_invalid_rows(self):
        with self.assertRaises(ValidationError):
            QueryResult(
                columns=[ColumnSpec(name="val", data_type="numeric")],
                rows="not-a-list"  # Must be a list
            )

    # 6. Invalid analysis (missing summary)
    def test_06_invalid_analysis_missing_summary(self):
        with self.assertRaises(ValidationError):
            AnalysisContent(summary="")  # Min length 1 required

    # 7. Missing optional metadata and optional fields
    def test_07_missing_optional_fields(self):
        res = AnalysisResult(
            business_question="Which product categories generated the highest revenue?",
            query_result=QueryResult(
                columns=[ColumnSpec(name="cat", data_type="text"), ColumnSpec(name="rev", data_type="numeric")],
                rows=[{"cat": "A", "rev": 100}]
            ),
            analysis=AnalysisContent(summary="Summary without optional metadata"),
            # Note: sql, data_source, tables_used, metadata omitted
        )
        self.assertIsNone(res.sql)
        self.assertEqual(res.tables_used, [])
        self.assertIsNotNone(res.data_source)  # Auto-defaulted
        self.assertIsNotNone(res.metadata.generated_at)  # Auto-defaulted
        is_valid, errors = ValidationService.validate(res)
        self.assertTrue(is_valid)

    # 8. Empty results (row_count = 0)
    def test_08_empty_results(self):
        res = AnalysisResult(
            business_question="Show inactive customer accounts",
            query_result=QueryResult(
                columns=[ColumnSpec(name="cust_id", data_type="integer")],
                rows=[],
                row_count=0
            ),
            analysis=AnalysisContent(
                summary="Zero inactive accounts were returned.",
                key_findings=["All customer accounts are active."]
            )
        )
        self.assertEqual(res.query_result.row_count, 0)
        self.assertEqual(len(res.query_result.rows), 0)
        is_valid, errors = ValidationService.validate(res)
        self.assertTrue(is_valid)

    # 9. Numeric results
    def test_09_numeric_results(self):
        res = AnalysisResult(
            business_question="Calculate average order value and total margins",
            query_result=QueryResult(
                columns=[
                    ColumnSpec(name="aov", data_type="numeric"),
                    ColumnSpec(name="margin_pct", data_type="numeric"),
                    ColumnSpec(name="total_orders", data_type="integer"),
                ],
                rows=[{"aov": 1420.50, "margin_pct": 34.2, "total_orders": 8500}],
            ),
            analysis=AnalysisContent(summary="AOV is ₹1,420.50 with 34.2% margin.")
        )
        self.assertEqual(res.query_result.rows[0]["aov"], 1420.50)
        is_valid, errors = ValidationService.validate(res)
        self.assertTrue(is_valid)

    # 10. Time-series results
    def test_10_timeseries_results(self):
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
        rows = [{"month": m, "revenue": 100000 * (i + 1)} for i, m in enumerate(months)]
        res = AnalysisResult(
            business_question="Show monthly sales trend for first half",
            query_result=QueryResult(
                columns=[ColumnSpec(name="month", data_type="text"), ColumnSpec(name="revenue", data_type="numeric")],
                rows=rows,
            ),
            analysis=AnalysisContent(summary="H1 monthly revenue showed steady expansion.")
        )
        self.assertEqual(res.query_result.row_count, 6)
        is_valid, errors = ValidationService.validate(res)
        self.assertTrue(is_valid)

    # 11. Categorical results
    def test_11_categorical_results(self):
        res = AnalysisResult(
            business_question="Show employee distribution by department",
            data_source=DataSourceInfo(id="hrms_db", name="HRMS Core", engine="PostgreSQL"),
            tables_used=["departments", "employees"],
            sql="SELECT department, COUNT(employee_id) FROM employees GROUP BY department;",
            query_result=QueryResult(
                columns=[ColumnSpec(name="department", data_type="text"), ColumnSpec(name="headcount", data_type="integer")],
                rows=[
                    {"department": "Engineering", "headcount": 42},
                    {"department": "Operations", "headcount": 31},
                    {"department": "Sales", "headcount": 27},
                    {"department": "Finance", "headcount": 12},
                    {"department": "HR", "headcount": 8},
                ],
            ),
            analysis=AnalysisContent(
                summary="Engineering is the largest department with 42 employees.",
                key_findings=["Engineering and Operations comprise 60% of workforce."],
                recommendations=["Plan Q3 engineering expansion."]
            )
        )
        self.assertEqual(len(res.query_result.rows), 5)
        is_valid, errors = ValidationService.validate(res)
        self.assertTrue(is_valid)


if __name__ == "__main__":
    unittest.main()
