"""Tests for Umanathan's architecture and orchestration layer."""

import unittest

from agents.agent_pipeline import AgentPipeline
from orchestrator import Orchestrator
from security.sql_validator import SQLValidator
from tests.test_integration import MockPipelineLLM


class TestOrchestrator(unittest.TestCase):
    def setUp(self):
        self.orchestrator = Orchestrator(pipeline=AgentPipeline(llm_client=MockPipelineLLM()))

    def test_complete_trend_contract(self):
        result = self.orchestrator.handle_query("Show monthly sales trend for the last year.", "demo")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["source"], "ecommerce_db")
        self.assertEqual(result["visualizations"][0]["type"], "line")
        self.assertIn("sql_validated", result["trace"])
        self.assertIn("query_executed", result["trace"])

    def test_hrms_uses_same_path(self):
        result = self.orchestrator.handle_query("Show employee distribution by department.", "hr-demo")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["source"], "hrms_db")
        self.assertEqual(result["visualizations"][0]["type"], "bar")

    def test_context_is_saved(self):
        self.orchestrator.handle_query("Show monthly sales trend for the last year.", "follow-up")
        turns = self.orchestrator.context.get("follow-up")
        self.assertEqual(len(turns), 1)
        self.assertEqual(turns[0]["intent"]["analysis"], "trend")

    def test_validator_rejects_unsafe_and_multiple_statements(self):
        validator = SQLValidator()
        self.assertFalse(validator.validate("DROP TABLE orders").safe)
        self.assertFalse(validator.validate("SELECT * FROM orders; DELETE FROM orders").safe)
        safe = validator.validate("SELECT * FROM orders")
        self.assertTrue(safe.safe)
        self.assertIn("LIMIT 500", safe.sql)

    def test_root_cause_flow(self):
        result = self.orchestrator.handle_query("Why did sales decrease last month?", "rca")
        self.assertEqual(result["status"], "success")
        self.assertIsNotNone(result["rootCause"])
        self.assertIn("root_cause_complete", result["trace"])

    def test_empty_query_returns_structured_error(self):
        result = self.orchestrator.handle_query(" ", "demo")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["stage"], "receive_query")


if __name__ == "__main__":
    unittest.main()
