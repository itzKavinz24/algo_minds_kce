"""Test suite for the Analytics Agent.

Tests:
1. Deterministic calculation accuracy (Trend %, category shares, anomalies, KPIs).
2. Five mock analytical scenarios.
3. Empty / malformed data handling.
4. LLM output parsing & markdown fence handling.
5. End-to-end multi-agent pipeline: Intent -> SQL -> Data -> Analytics.
"""

import os
import sys
import unittest
from typing import Any, Dict, List, Optional
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from llm.base import BaseLLMClient
from models.schemas import AnalyticsOutput, IntentOutput, SQLOutput
from models.mock_data import (
    MOCK_MONTHLY_REVENUE_TREND,
    MOCK_REVENUE_BY_CATEGORY,
    MOCK_SINGLE_KPI_THIS_MONTH,
    MOCK_EMPLOYEE_DISTRIBUTION,
    MOCK_DECLINING_SALES_SCENARIO,
    MOCK_CATEGORY_SALES_DURING_DECLINE,
)
from models.mock_schema import ECOMMERCE_SCHEMA, HRMS_SCHEMA
from agents.intent_agent import IntentAgent
from agents.sql_agent import SQLAgent
from agents.analytics_agent import AnalyticsAgent


class MockLLMClient(BaseLLMClient):
    """Deterministic mock LLM client for offline unit testing."""

    def __init__(self, canned_response: str) -> None:
        self.canned_response = canned_response
        self.last_messages: List[Dict[str, str]] = []

    def generate(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        self.last_messages = messages
        return self.canned_response


class TestAnalyticsAgentOffline(unittest.TestCase):
    """Offline unit tests verifying mathematical precision, schema models, and error handling."""

    def setUp(self):
        self.agent = AnalyticsAgent(llm_client=MockLLMClient("{}"))

    def test_deterministic_trend_calculations(self):
        intent = IntentOutput(domain="ecommerce", analysis="trend", metric="sales")
        stats = self.agent.calculate_statistics(MOCK_MONTHLY_REVENUE_TREND, intent=intent)

        self.assertEqual(stats["row_count"], 12)
        self.assertEqual(stats["start_value"], 105000.0)
        self.assertEqual(stats["end_value"], 230000.0)
        self.assertEqual(stats["total_sum"], 1820000.0)
        self.assertEqual(stats["average"], round(1820000.0 / 12, 2))
        self.assertEqual(stats["overall_change_amount"], 125000.0)
        # % change: ((230000 - 105000) / 105000) * 100 = 119.05%
        self.assertEqual(stats["overall_change_pct"], 119.05)
        self.assertEqual(stats["trend"], "increasing")

    def test_deterministic_category_distribution(self):
        intent = IntentOutput(domain="ecommerce", analysis="breakdown", metric="revenue")
        stats = self.agent.calculate_statistics(MOCK_REVENUE_BY_CATEGORY, intent=intent)

        self.assertEqual(stats["row_count"], 5)
        self.assertEqual(stats["total_sum"], 1795000.0)
        self.assertEqual(stats["highest_segment"]["label"], "Electronics")
        self.assertEqual(stats["highest_segment"]["value"], 850000.0)
        # Share: (850000 / 1795000) * 100 = 47.35%
        self.assertEqual(stats["highest_segment"]["share_pct"], 47.35)
        self.assertEqual(stats["lowest_segment"]["label"], "Beauty")
        self.assertEqual(stats["lowest_segment"]["share_pct"], 5.29)

    def test_deterministic_single_kpi(self):
        intent = IntentOutput(domain="ecommerce", analysis="aggregate", metric="revenue")
        stats = self.agent.calculate_statistics(MOCK_SINGLE_KPI_THIS_MONTH, intent=intent)

        self.assertEqual(stats["row_count"], 1)
        self.assertEqual(stats["scalar_value"], 185250.0)
        self.assertEqual(stats["analysis_type"], "single_kpi")

    def test_deterministic_anomaly_detection_in_declining_sales(self):
        intent = IntentOutput(domain="ecommerce", analysis="trend", metric="sales")
        stats = self.agent.calculate_statistics(MOCK_DECLINING_SALES_SCENARIO, intent=intent)

        self.assertEqual(stats["row_count"], 4)
        self.assertEqual(stats["trend"], "decreasing")
        self.assertTrue(len(stats["detected_anomalies"]) >= 1)
        self.assertIn("-18.0%", stats["detected_anomalies"][0])

    def test_empty_data_handled_gracefully(self):
        res = self.agent.analyze(
            question="Show revenue",
            intent={"domain": "ecommerce", "analysis": "trend"},
            sql="SELECT * FROM orders;",
            data=[],
        )
        self.assertIsInstance(res, AnalyticsOutput)
        self.assertEqual(res.computed_metrics["row_count"], 0)
        self.assertIn("0 rows", res.key_insights[0])

    def test_invalid_data_type_raises_error(self):
        with self.assertRaises(ValueError):
            self.agent.analyze(
                question="Show revenue",
                intent={"domain": "ecommerce", "analysis": "trend"},
                sql="SELECT * FROM orders;",
                data="not a list",  # type: ignore
            )

    def test_clean_json_parsing_with_code_fences(self):
        canned = """```json
{
  "summary": "Monthly sales increased significantly.",
  "key_insights": ["Annual revenue reached $1.81M with a 119.05% growth."],
  "trend_direction": "increasing",
  "anomalies": [],
  "recommendations": ["Replicate Q4 promotional strategies."],
  "suggested_chart_type": "line_chart"
}
```"""
        agent = AnalyticsAgent(llm_client=MockLLMClient(canned))
        intent = IntentOutput(domain="ecommerce", analysis="trend", metric="sales")
        out = agent.analyze(
            question="Show monthly sales trend for the last year.",
            intent=intent,
            sql="SELECT month, total_sales FROM orders...",
            data=MOCK_MONTHLY_REVENUE_TREND,
        )

        self.assertIsInstance(out, AnalyticsOutput)
        self.assertEqual(out.trend_direction, "increasing")
        self.assertEqual(out.suggested_chart_type, "line_chart")
        self.assertEqual(out.computed_metrics["total_sum"], 1820000.0)


def run_live_analytics_tests():
    """Run live multi-agent tests (Intent -> SQL -> Mock Data -> Analytics) with Groq API."""
    print("\n" + "=" * 80)
    print(" Running Live Analytics Agent Tests against Groq API")
    print("=" * 80)

    try:
        intent_agent = IntentAgent()
        sql_agent = SQLAgent()
        analytics_agent = AnalyticsAgent()
    except (ValueError, ImportError) as e:
        print(f"\n[SKIPPED LIVE TESTS] {e}")
        print("To run live Groq tests, install dependencies (`pip install -r requirements.txt`) and set GROQ_API_KEY in your .env file.\n")
        return

    scenarios = [
        {
            "name": "Scenario 1: Monthly Sales Trend (12 Months)",
            "question": "Show monthly sales trend for the last year.",
            "schema": ECOMMERCE_SCHEMA,
            "mock_data": MOCK_MONTHLY_REVENUE_TREND,
            "expected_chart": "line_chart",
        },
        {
            "name": "Scenario 2: Revenue by Product Category",
            "question": "Show revenue by category.",
            "schema": ECOMMERCE_SCHEMA,
            "mock_data": MOCK_REVENUE_BY_CATEGORY,
            "expected_chart": "bar_chart",
        },
        {
            "name": "Scenario 3: Single KPI - Total Revenue This Month",
            "question": "What is total revenue this month?",
            "schema": ECOMMERCE_SCHEMA,
            "mock_data": MOCK_SINGLE_KPI_THIS_MONTH,
            "expected_chart": "metric_card",
        },
        {
            "name": "Scenario 4: HRMS Employee Distribution by Department",
            "question": "Show employee distribution by department.",
            "schema": HRMS_SCHEMA,
            "mock_data": MOCK_EMPLOYEE_DISTRIBUTION,
            "expected_chart": "bar_chart",
        },
        {
            "name": "Scenario 5: Declining Sales Anomaly Scenario",
            "question": "Why did sales decrease last month?",
            "schema": ECOMMERCE_SCHEMA,
            "mock_data": MOCK_DECLINING_SALES_SCENARIO,
            "expected_chart": "line_chart",
        },
    ]

    for sc in scenarios:
        print(f"\n--- {sc['name']} ---")
        print(f"  User Question : \"{sc['question']}\"")

        # Step 1: Intent Extraction
        intent = intent_agent.parse_intent(sc["question"])
        print(f"  [Intent]      : domain='{intent.domain}', analysis='{intent.analysis}', metric='{intent.metric}', is_rca={intent.is_root_cause_query}")

        # Step 2: SQL Generation
        sql_res = sql_agent.generate_sql(question=sc["question"], intent=intent, schema=sc["schema"])
        print(f"  [SQL]         : {sql_res.sql}")

        # Step 3: Analytics Execution (Consuming Mock Data)
        analytics_res = analytics_agent.analyze(
            question=sc["question"],
            intent=intent,
            sql=sql_res.sql,
            data=sc["mock_data"],
        )

        print(f"  [Summary]     : {analytics_res.summary}")
        print(f"  [Insights]    : {json.dumps(analytics_res.key_insights, indent=4)}")
        print(f"  [Metrics]     : {json.dumps(analytics_res.computed_metrics, indent=4)}")
        print(f"  [Anomalies]   : {analytics_res.anomalies}")
        print(f"  [Recs]        : {analytics_res.recommendations}")
        print(f"  [Chart Type]  : {analytics_res.suggested_chart_type}")

        # Structural assertions
        assert analytics_res.summary, "Summary should not be empty."
        assert len(analytics_res.key_insights) >= 1, "Should have at least 1 key insight."
        assert analytics_res.computed_metrics["row_count"] == len(sc["mock_data"]), "Row count mismatch in metrics."
        print(f"  [PASS] {sc['name']} verified successfully.\n")

    print("=" * 80)
    print(" ALL ANALYTICS AGENT TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestAnalyticsAgentOffline)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if not result.wasSuccessful():
        sys.exit(1)

    run_live_analytics_tests()
