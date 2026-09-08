"""Integration test suite for the unified AgentPipeline."""

import os
import sys
import unittest
from typing import Any, Dict, List, Optional
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from llm.base import BaseLLMClient
from models.schemas import PipelineResult
from models.mock_schema import ECOMMERCE_SCHEMA, HRMS_SCHEMA
from agents.agent_pipeline import AgentPipeline
from agents.intent_agent import IntentAgent
from agents.sql_agent import SQLAgent
from agents.analytics_agent import AnalyticsAgent
from agents.root_cause_agent import RootCauseAgent


class MockPipelineLLM(BaseLLMClient):
    """Dynamic Mock LLM for offline testing of the unified pipeline."""

    def generate(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        user_message = messages[-1].get("content", "") if messages else ""
        system_message = messages[0].get("content", "") if messages else ""

        # 1. Intent routing
        if "Intent Classification" in system_message:
            if "Why did sales decrease" in user_message or "decrease" in user_message:
                return json.dumps({
                    "domain": "ecommerce",
                    "analysis": "root_cause",
                    "metric": "sales",
                    "time_period": "last_month",
                    "grouping": None,
                    "filters": [],
                    "is_root_cause_query": True,
                    "confidence": 0.98
                })
            elif "employee" in user_message.lower() or "department" in user_message.lower():
                return json.dumps({
                    "domain": "hr",
                    "analysis": "distribution",
                    "metric": "headcount",
                    "time_period": None,
                    "grouping": "department",
                    "filters": [],
                    "is_root_cause_query": False,
                    "confidence": 0.97
                })
            elif "this month" in user_message.lower():
                return json.dumps({
                    "domain": "ecommerce",
                    "analysis": "aggregate",
                    "metric": "revenue",
                    "time_period": "this_month",
                    "grouping": None,
                    "filters": [],
                    "is_root_cause_query": False,
                    "confidence": 0.99
                })
            else:
                return json.dumps({
                    "domain": "ecommerce",
                    "analysis": "trend",
                    "metric": "sales",
                    "time_period": "last_year",
                    "grouping": "month",
                    "filters": [],
                    "is_root_cause_query": False,
                    "confidence": 0.99
                })

        # 2. SQL Agent
        elif "SQL Generation Agent" in system_message:
            if "department" in user_message.lower():
                return json.dumps({
                    "sql": "SELECT d.department_name, COUNT(e.employee_id) AS employee_count FROM departments d LEFT JOIN employees e ON d.department_id = e.department_id GROUP BY d.department_name;",
                    "tables_used": ["departments", "employees"],
                    "columns_used": ["department_name", "employee_id"],
                    "explanation": "Counts employees per department."
                })
            elif "this month" in user_message.lower():
                return json.dumps({
                    "sql": "SELECT SUM(total_amount) AS total_revenue FROM orders WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE);",
                    "tables_used": ["orders"],
                    "columns_used": ["total_amount", "order_date"],
                    "explanation": "Calculates revenue for current month."
                })
            else:
                return json.dumps({
                    "sql": "SELECT DATE_TRUNC('month', order_date) AS month, SUM(total_amount) AS total_sales FROM orders WHERE order_date >= NOW() - INTERVAL '1 year' GROUP BY 1 ORDER BY 1 ASC;",
                    "tables_used": ["orders"],
                    "columns_used": ["order_date", "total_amount"],
                    "explanation": "Calculates monthly sales trend."
                })

        # 3. Analytics Agent
        elif "Analytics and Business Intelligence Agent" in system_message:
            return json.dumps({
                "summary": "Monthly sales expanded steadily across the year.",
                "key_insights": [
                    "Annual revenue reached $1,820,000.",
                    "December recorded the highest sales peak."
                ],
                "trend_direction": "increasing",
                "anomalies": [],
                "recommendations": ["Replicate Q4 promotional strategies."],
                "suggested_chart_type": "line_chart"
            })

        # 4. RCA Hypotheses
        elif "Root-Cause Diagnostic Agent" in system_message:
            return json.dumps([
                {
                    "id": "category_decline",
                    "description": "Decline concentrated in Electronics category.",
                    "dimension": "category",
                    "evidence_queries": [
                        {
                            "hypothesis_id": "category_decline",
                            "question": "Compare sales by product category between last month and previous month.",
                            "purpose": "Verify category level revenue changes."
                        }
                    ]
                }
            ])

        # 5. RCA Synthesis
        elif "Root-Cause Analysis Synthesis Agent" in system_message:
            return json.dumps({
                "primary_contributor": "Electronics product category decline",
                "findings_summary": "Electronics dropped by 31.19% and accounted for 72.78% of the total revenue drop.",
                "confidence": "high",
                "evidence": [
                    {
                        "hypothesis_id": "category_decline",
                        "finding": "Electronics fell by $131,000, accounting for 72.78% of total decline.",
                        "support": "strongly_supported",
                        "contribution_percent": 72.78
                    }
                ],
                "recommendations": [
                    "Investigate Electronics inventory availability.",
                    "Review marketing campaigns in Electronics."
                ]
            })

        return "{}"


class TestIntegrationOffline(unittest.TestCase):
    """Offline integration tests for the complete AgentVerse Agent Layer."""

    def setUp(self):
        mock_llm = MockPipelineLLM()
        self.pipeline = AgentPipeline(llm_client=mock_llm)

    def test_trend_question_pipeline(self):
        result = self.pipeline.process_question("Show monthly sales trend for the last year.")

        self.assertIsInstance(result, PipelineResult)
        self.assertEqual(result.query, "Show monthly sales trend for the last year.")
        self.assertEqual(result.trace, ["intent", "sql_generation", "analytics"])
        self.assertIsNotNone(result.intent)
        self.assertIsNotNone(result.sql)
        self.assertIsNotNone(result.analytics)
        self.assertIsNone(result.root_cause)

        self.assertEqual(result.intent["analysis"], "trend")
        self.assertTrue(result.sql["sql"].startswith("SELECT"))

    def test_root_cause_question_pipeline_routes_to_rca(self):
        result = self.pipeline.process_question("Why did sales decrease last month?")

        self.assertIsInstance(result, PipelineResult)
        self.assertEqual(result.trace, ["intent", "sql_generation", "analytics", "root_cause"])
        self.assertIsNotNone(result.root_cause)
        self.assertIn("Electronics", result.root_cause["primary_contributor"])
        self.assertEqual(result.root_cause["confidence"], "high")

        # Explicit verification: Analytics and RCA operate on the same unified dataset
        rca_baseline = result.root_cause["baseline"]
        self.assertEqual(rca_baseline["previous_value"], 1000000.0)
        self.assertEqual(rca_baseline["current_value"], 820000.0)
        self.assertEqual(rca_baseline["change_amount"], -180000.0)
        self.assertEqual(rca_baseline["change_percent"], -18.0)

        # Confirm Analytics computed metrics reflect the exact same end value
        analytics_metrics = result.analytics["computed_metrics"]
        self.assertEqual(analytics_metrics["end_value"], 820000.0)

    def test_kpi_question_pipeline(self):
        result = self.pipeline.process_question("What is total revenue this month?")

        self.assertIsInstance(result, PipelineResult)
        self.assertEqual(result.trace, ["intent", "sql_generation", "analytics"])
        self.assertIsNone(result.root_cause)
        self.assertEqual(result.intent["analysis"], "aggregate")

    def test_hrms_question_pipeline(self):
        result = self.pipeline.process_question("Show employee distribution by department.")

        self.assertIsInstance(result, PipelineResult)
        self.assertEqual(result.trace, ["intent", "sql_generation", "analytics"])
        self.assertEqual(result.intent["domain"], "hr")
        self.assertIn("departments", result.sql["tables_used"])

    def test_empty_question_raises_value_error(self):
        with self.assertRaises(ValueError):
            self.pipeline.process_question("   ")


def run_live_integration_tests():
    """Run live pipeline integration test against Groq if GROQ_API_KEY is available."""
    key = os.getenv("GROQ_API_KEY", "")
    if not key or key == "your_api_key_here" or not key.startswith("gsk_"):
        print("\n[SKIPPED LIVE INTEGRATION TESTS] GROQ_API_KEY is not configured.")
        return

    print("\n" + "=" * 80)
    print(" Running Live AgentPipeline Integration Tests against Groq API")
    print("=" * 80)

    pipeline = AgentPipeline()

    test_queries = [
        "Show monthly sales trend for the last year.",
        "Why did sales decrease last month?",
        "What is total revenue this month?",
    ]

    for q in test_queries:
        print(f"\nProcessing: \"{q}\"")
        res = pipeline.process_question(q)
        print(f"  Trace: {res.trace}")
        print(f"  Intent: analysis='{res.intent.get('analysis')}', metric='{res.intent.get('metric')}'")
        print(f"  SQL: {res.sql.get('sql')}")
        print(f"  Analytics: {res.analytics.get('summary')}")
        if res.root_cause:
            print(f"  Root Cause: {res.root_cause.get('primary_contributor')} ({res.root_cause.get('confidence')})")
        print("  [PASS] Completed successfully.\n")


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestIntegrationOffline)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if not result.wasSuccessful():
        sys.exit(1)

    run_live_integration_tests()
