"""
Comprehensive 20-Scenario Automated Test Suite for Enterprise Analytics Report Generator.
Validates all 20 test scenarios specified in Section 26 of the architecture audit.
"""

import sys
import io
import unittest
from pathlib import Path
from datetime import datetime
from unittest.mock import patch

TEST_DIR = Path(__file__).resolve().parent
ROOT_DIR = TEST_DIR.parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
import pypdf

from app.models.analysis_result import (
    AnalysisResult,
    DataSourceInfo,
    ColumnSpec,
    QueryResult,
    AnalysisContent,
    ReportMetadata,
)
from app.utils.formatting import (
    format_indian_number,
    format_currency,
    format_percentage,
    humanize_column_name,
    is_currency_column,
    format_cell_value,
)
from app.services.chart_service import ChartService
from app.services.pdf_service import PDFService
from app.services.validation_service import ValidationService
from app.services.report_service import ReportService
from app.main import app


class TestReportGeneratorSuite(unittest.TestCase):
    """Test suite covering all 20 scenarios from Section 26."""

    def setUp(self):
        self.report_service = ReportService()
        self.client = TestClient(app)

    # -------------------------------------------------------------
    # 1. Valid AnalysisResult
    # -------------------------------------------------------------
    def test_01_valid_analysis_result(self):
        res = AnalysisResult(
            business_question="What is the total quarterly revenue?",
            data_source=DataSourceInfo(id="ecommerce_db", engine="PostgreSQL"),
            tables_used=["orders"],
            sql="SELECT SUM(total_amount) AS revenue FROM orders;",
            query_result=QueryResult(
                columns=[ColumnSpec(name="revenue", data_type="numeric")],
                rows=[{"revenue": 12500000}],
                row_count=1,
            ),
            analysis=AnalysisContent(
                summary="Total quarterly revenue reached ₹1.25 Cr.",
                key_findings=["Quarterly revenue grew by 18%."],
                recommendations=["Maintain stock for peak seasonal categories."]
            ),
        )
        self.assertIsNotNone(res.report_id)
        self.assertTrue(res.report_id.startswith("RPT-"))
        self.assertIsNotNone(res.metadata.generated_at)

    # -------------------------------------------------------------
    # 2. Invalid AnalysisResult
    # -------------------------------------------------------------
    def test_02_invalid_analysis_result(self):
        with self.assertRaises(Exception):
            AnalysisResult(
                business_question="",  # Invalid: too short
                query_result=None,
                analysis=AnalysisContent(summary=""),
            )

    # -------------------------------------------------------------
    # 3. Empty Result (row_count = 0)
    # -------------------------------------------------------------
    def test_03_empty_result(self):
        res = AnalysisResult(
            business_question="Show inactive customer accounts with zero orders",
            data_source=DataSourceInfo(id="crm_db", engine="PostgreSQL"),
            tables_used=["customers", "orders"],
            sql="SELECT * FROM customers WHERE order_count = 0;",
            query_result=QueryResult(
                columns=[ColumnSpec(name="customer_id", data_type="integer"), ColumnSpec(name="name", data_type="text")],
                rows=[],
                row_count=0,
            ),
            analysis=AnalysisContent(
                summary="No records were returned for this analysis.",
                key_findings=["Zero inactive customer accounts detected."],
                recommendations=[]
            ),
        )
        resp, pdf_bytes = self.report_service.generate(res)
        self.assertEqual(resp.status, "completed")
        self.assertEqual(resp.row_count, 0)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))

    # -------------------------------------------------------------
    # 4. Single Row Result
    # -------------------------------------------------------------
    def test_04_single_row(self):
        res = AnalysisResult(
            business_question="What is total enterprise revenue this month?",
            data_source=DataSourceInfo(id="ecommerce_db", engine="PostgreSQL"),
            tables_used=["orders"],
            sql="SELECT SUM(total_amount) AS revenue FROM orders WHERE order_date >= '2026-09-01';",
            query_result=QueryResult(
                columns=[ColumnSpec(name="revenue", data_type="numeric")],
                rows=[{"revenue": 4580000}],
                row_count=1,
            ),
            analysis=AnalysisContent(
                summary="Current month revenue is ₹45,80,000.",
                key_findings=["Month-to-date targets have been exceeded by 12%."],
                recommendations=["Allocate ad spend to trending categories."]
            ),
        )
        resp, pdf_bytes = self.report_service.generate(res)
        self.assertEqual(resp.row_count, 1)
        target_path = self.report_service.get_report_path(resp.report_id)
        self.assertIsNotNone(target_path)
        self.assertTrue(target_path.exists())

    # -------------------------------------------------------------
    # 5. Multiple Rows Result
    # -------------------------------------------------------------
    def test_05_multiple_rows(self):
        rows = [{"dept": f"Dept {i}", "headcount": 10 * (i + 1)} for i in range(5)]
        res = AnalysisResult(
            business_question="Show headcount across 5 corporate departments",
            query_result=QueryResult(
                columns=[ColumnSpec(name="dept", data_type="text"), ColumnSpec(name="headcount", data_type="integer")],
                rows=rows,
                row_count=5
            ),
            analysis=AnalysisContent(summary="Headcount across 5 departments totaled 150 employees.")
        )
        resp, pdf_bytes = self.report_service.generate(res)
        self.assertEqual(resp.row_count, 5)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))

    # -------------------------------------------------------------
    # 6. Large Result (>50 Rows, Truncation Policy)
    # -------------------------------------------------------------
    def test_06_large_result(self):
        rows = [{"order_id": 1000 + i, "customer": f"Corp {i}", "amount": 2500 + i} for i in range(120)]
        res = AnalysisResult(
            business_question="List all corporate transactions",
            query_result=QueryResult(
                columns=[
                    ColumnSpec(name="order_id", data_type="integer"),
                    ColumnSpec(name="customer", data_type="text"),
                    ColumnSpec(name="amount", data_type="numeric"),
                ],
                rows=rows,
                row_count=len(rows),
            ),
            analysis=AnalysisContent(summary="120 corporate transactions recorded.")
        )
        resp, pdf_bytes = self.report_service.generate(res)
        self.assertEqual(resp.row_count, 120)
        self.assertTrue(res.metadata.truncated)  # Large result policy flag
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        self.assertGreater(len(reader.pages), 1)

    # -------------------------------------------------------------
    # 7. Numeric Formatting
    # -------------------------------------------------------------
    def test_07_numeric_formatting(self):
        self.assertEqual(format_indian_number(2039938, decimals=0), "20,39,938")
        self.assertEqual(format_indian_number(475275, decimals=2), "4,75,275.00")
        self.assertEqual(format_percentage(0.423, decimals=1), "42.3%")

    # -------------------------------------------------------------
    # 8. Currency Formatting (Indian Currency ₹)
    # -------------------------------------------------------------
    def test_08_currency_formatting(self):
        self.assertEqual(format_currency(2039938, symbol="₹", decimals=0), "₹20,39,938")
        self.assertEqual(format_currency(10000000, symbol="₹", decimals=2), "₹1,00,00,000.00")

    # -------------------------------------------------------------
    # 9. Time Series (Monthly Trend Line Chart)
    # -------------------------------------------------------------
    def test_09_time_series(self):
        qr = QueryResult(
            columns=[ColumnSpec(name="month", data_type="text"), ColumnSpec(name="revenue", data_type="numeric")],
            rows=[
                {"month": "Jan", "revenue": 1180000},
                {"month": "Feb", "revenue": 1250000},
                {"month": "Mar", "revenue": 1420000},
                {"month": "Apr", "revenue": 1510000},
            ],
            row_count=4,
        )
        chart_png = ChartService.generate_chart(qr, "Monthly sales trend")
        self.assertIsNotNone(chart_png)
        self.assertTrue(chart_png.startswith(b"\x89PNG"))

    # -------------------------------------------------------------
    # 10. Category Chart (Bar Chart)
    # -------------------------------------------------------------
    def test_10_category_chart(self):
        qr = QueryResult(
            columns=[ColumnSpec(name="category", data_type="text"), ColumnSpec(name="revenue", data_type="numeric")],
            rows=[
                {"category": "Electronics", "revenue": 2039938},
                {"category": "Home & Kitchen", "revenue": 475275},
                {"category": "Sports", "revenue": 432477},
            ],
            row_count=3,
        )
        chart_png = ChartService.generate_chart(qr, "Category revenue breakdown")
        self.assertIsNotNone(chart_png)
        self.assertTrue(chart_png.startswith(b"\x89PNG"))

    # -------------------------------------------------------------
    # 11. No-Chart Scenario (Scalar KPI / Non-chartable)
    # -------------------------------------------------------------
    def test_11_no_chart_scenario(self):
        # Only text columns or 0 rows
        qr = QueryResult(
            columns=[ColumnSpec(name="system_status", data_type="text")],
            rows=[{"system_status": "All systems operational"}],
            row_count=1
        )
        chart_png = ChartService.generate_chart(qr, "Check system status")
        self.assertIsNone(chart_png)

    # -------------------------------------------------------------
    # 12. Missing Recommendations (Graceful Handling)
    # -------------------------------------------------------------
    def test_12_missing_recommendations(self):
        res = AnalysisResult(
            business_question="What is the server response time across regions?",
            query_result=QueryResult(
                columns=[ColumnSpec(name="region", data_type="text"), ColumnSpec(name="latency_ms", data_type="numeric")],
                rows=[{"region": "ap-south-1", "latency_ms": 14.2}],
                row_count=1,
            ),
            analysis=AnalysisContent(
                summary="Latency is well within SLA thresholds.",
                key_findings=["All regions average under 20ms latency."],
                recommendations=[],  # Omitted
            ),
        )
        resp, pdf_bytes = self.report_service.generate(res)
        self.assertEqual(resp.status, "completed")
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))

    # -------------------------------------------------------------
    # 13. Missing Metadata (Graceful Handling)
    # -------------------------------------------------------------
    def test_13_missing_metadata(self):
        res = AnalysisResult(
            business_question="Count total product reviews",
            query_result=QueryResult(
                columns=[ColumnSpec(name="total", data_type="integer")],
                rows=[{"total": 54200}],
                row_count=1,
            ),
            analysis=AnalysisContent(summary="54,200 verified customer reviews recorded."),
            metadata=None,
        )
        self.assertIsNotNone(res.metadata.generated_at)
        resp, _ = self.report_service.generate(res)
        self.assertEqual(resp.status, "completed")

    # -------------------------------------------------------------
    # 14. SQL Formatting
    # -------------------------------------------------------------
    def test_14_sql_formatting(self):
        res = AnalysisResult(
            business_question="Multi-line SQL formatting audit",
            sql="""
            SELECT
                orders.order_id,
                customers.company_name,
                ROUND(SUM(order_items.unit_price * order_items.quantity), 2) AS total_amount
            FROM orders
            JOIN customers ON orders.customer_id = customers.customer_id
            JOIN order_items ON orders.order_id = order_items.order_id
            WHERE orders.order_date >= '2026-01-01'
            GROUP BY orders.order_id, customers.company_name
            ORDER BY total_amount DESC
            LIMIT 10;
            """,
            query_result=QueryResult(
                columns=[ColumnSpec(name="total_amount", data_type="numeric")],
                rows=[{"total_amount": 95000}],
                row_count=1
            ),
            analysis=AnalysisContent(summary="Complex query executed cleanly.")
        )
        pdf_bytes = PDFService.generate_pdf(res)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))

    # -------------------------------------------------------------
    # 15. Multi-Page PDF (Pagination with NumberedCanvas)
    # -------------------------------------------------------------
    def test_15_multipage_pdf(self):
        rows = [{"sku": f"SKU-{i:03d}", "sales": 1000 + (i * 50)} for i in range(45)]
        res = AnalysisResult(
            business_question="Multi-page pagination test",
            query_result=QueryResult(
                columns=[ColumnSpec(name="sku", data_type="text"), ColumnSpec(name="sales", data_type="numeric")],
                rows=rows,
                row_count=45
            ),
            analysis=AnalysisContent(
                summary="Multi-page document test.",
                key_findings=["Observation 1", "Observation 2", "Observation 3"]
            )
        )
        resp, pdf_bytes = self.report_service.generate(res)
        self.assertGreaterEqual(resp.page_count, 2)
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        self.assertGreaterEqual(len(reader.pages), 2)

    # -------------------------------------------------------------
    # 16. Wide Table (Multiple Columns Fitting Page)
    # -------------------------------------------------------------
    def test_16_wide_table(self):
        cols = [ColumnSpec(name=f"col_{i}", data_type="text") for i in range(8)]
        rows = [{f"col_{i}": f"val_{i}" for i in range(8)} for _ in range(3)]
        res = AnalysisResult(
            business_question="Wide 8-column layout audit",
            query_result=QueryResult(columns=cols, rows=rows, row_count=3),
            analysis=AnalysisContent(summary="8-column table layout verified.")
        )
        resp, pdf_bytes = self.report_service.generate(res)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))

    # -------------------------------------------------------------
    # 17. Long SQL Query (Wrapping & Padding)
    # -------------------------------------------------------------
    def test_17_long_sql(self):
        long_sql = "SELECT " + ", ".join([f"field_{i} AS alias_{i}" for i in range(30)]) + " FROM massive_warehouse_table WHERE active = true;"
        res = AnalysisResult(
            business_question="Audit very long SQL text wrapping",
            sql=long_sql,
            query_result=QueryResult(columns=[ColumnSpec(name="alias_0", data_type="text")], rows=[{"alias_0": "ok"}], row_count=1),
            analysis=AnalysisContent(summary="Long SQL query wrapped cleanly.")
        )
        pdf_bytes = PDFService.generate_pdf(res)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))

    # -------------------------------------------------------------
    # 18. Long Findings (Paragraph Wrapping)
    # -------------------------------------------------------------
    def test_18_long_findings(self):
        long_finding = "A" * 500  # 500 characters of unbroken text
        res = AnalysisResult(
            business_question="Verify paragraph wrapping on long analytical finding",
            query_result=QueryResult(columns=[ColumnSpec(name="val", data_type="integer")], rows=[{"val": 1}], row_count=1),
            analysis=AnalysisContent(
                summary="Executive summary with long text.",
                key_findings=[long_finding, "Standard secondary finding."]
            )
        )
        pdf_bytes = PDFService.generate_pdf(res)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))

    # -------------------------------------------------------------
    # 19. Chart Failure Resilience (PDF Still Generates)
    # -------------------------------------------------------------
    def test_19_chart_failure(self):
        res = AnalysisResult(
            business_question="Chart failure resilience audit",
            query_result=QueryResult(
                columns=[ColumnSpec(name="val", data_type="numeric")],
                rows=[{"val": 100}],
                row_count=1
            ),
            analysis=AnalysisContent(summary="Resilience check passed.")
        )
        # Mock ChartService.generate_chart to raise an exception
        with patch.object(ChartService, "generate_chart", side_effect=RuntimeError("Matplotlib rendering error")):
            resp, pdf_bytes = self.report_service.generate(res)
            self.assertEqual(resp.status, "completed")
            self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))

    # -------------------------------------------------------------
    # 20. PDF Failure / Error Handling
    # -------------------------------------------------------------
    def test_20_pdf_failure_error_handling(self):
        # Invalid input through API endpoint should return HTTP 422
        bad_payload = {"analysis_result": {"business_question": ""}}
        post_resp = self.client.post("/generate-report", json=bad_payload)
        self.assertEqual(post_resp.status_code, 422)


if __name__ == "__main__":
    unittest.main()
