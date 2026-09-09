"""Tests for bounded SQL execution validation and self-correction."""

import unittest

from models.schemas import DatabaseSchema, IntentOutput, SQLOutput, TableMetadata
from orchestrator.sql_execution_guard import SQLExecutionError, SQLExecutionGuard
from security.sql_validator import SQLValidator


SCHEMA = DatabaseSchema(tables={
    "orders": TableMetadata(name="orders", columns=["order_id", "status", "amount"]),
})
INTENT = IntentOutput(domain="ecommerce", analysis="aggregate", metric="revenue")


class FakeMCP:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.calls = 0

    def execute_read_query(self, source, sql):
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    def describe_table(self, source, table):
        return {"name": table, "columns": [{"name": "status", "values": ["Completed", "Cancelled"]}]}

    def get_relationships(self, source):
        return []


class FakeSQLAgent:
    def __init__(self, corrections):
        self.corrections = list(corrections)
        self.contexts = []

    def generate_sql(self, question, intent, schema, context=None):
        self.contexts.append(context or "")
        return self.corrections.pop(0)


def sql(text):
    return SQLOutput(sql=text, tables_used=["orders"], columns_used=["status", "amount"])


class TestSQLExecutionGuard(unittest.TestCase):
    def execute(self, initial, mcp, agent):
        return SQLExecutionGuard(max_retries=2).execute(
            question="Show completed revenue", intent=INTENT,
            source="ecommerce_db", schema=SCHEMA, sql_result=initial,
            validator=SQLValidator(), mcp=mcp, sql_agent=agent,
        )

    def test_execution_error_is_corrected_and_retried(self):
        mcp = FakeMCP([RuntimeError("column does not exist"), [{"revenue": 10}]])
        outcome = self.execute(sql("SELECT bad FROM orders"), mcp, FakeSQLAgent([sql("SELECT SUM(amount) AS revenue FROM orders")]))
        self.assertEqual(outcome.rows, [{"revenue": 10}])
        self.assertEqual(outcome.result_validation["status"], "valid_after_retry")
        self.assertEqual(len(outcome.retries), 1)

    def test_filtered_zero_rows_uses_observed_metadata_values(self):
        mcp = FakeMCP([[], [{"revenue": 20}]])
        agent = FakeSQLAgent([sql("SELECT SUM(amount) AS revenue FROM orders WHERE status='Completed'")])
        outcome = self.execute(sql("SELECT SUM(amount) AS revenue FROM orders WHERE status='completed'"), mcp, agent)
        self.assertEqual(outcome.rows[0]["revenue"], 20)
        self.assertIn("Completed", agent.contexts[0])

    def test_unfiltered_empty_result_is_accepted_without_retry(self):
        mcp = FakeMCP([[]])
        agent = FakeSQLAgent([])
        outcome = self.execute(sql("SELECT order_id FROM orders"), mcp, agent)
        self.assertEqual(outcome.result_validation["status"], "valid_empty_unfiltered")
        self.assertEqual(mcp.calls, 1)

    def test_retry_limit_is_two(self):
        mcp = FakeMCP([RuntimeError("bad 1"), RuntimeError("bad 2"), RuntimeError("bad 3")])
        agent = FakeSQLAgent([sql("SELECT amount FROM orders"), sql("SELECT order_id FROM orders")])
        with self.assertRaises(SQLExecutionError) as raised:
            self.execute(sql("SELECT missing FROM orders"), mcp, agent)
        self.assertEqual(mcp.calls, 3)
        self.assertEqual(len(raised.exception.retries), 2)

    def test_unsafe_initial_sql_can_only_retry_with_validated_correction(self):
        mcp = FakeMCP([[{"order_id": 1}]])
        agent = FakeSQLAgent([sql("SELECT order_id FROM orders")])
        outcome = self.execute(sql("DELETE FROM orders"), mcp, agent)
        self.assertEqual(outcome.rows, [{"order_id": 1}])
        self.assertEqual(mcp.calls, 1)


if __name__ == "__main__":
    unittest.main()

