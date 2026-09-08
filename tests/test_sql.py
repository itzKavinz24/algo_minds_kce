"""Test suite for the SQL Agent.

Tests:
1. Schema awareness (E-Commerce vs HRMS).
2. Five fixed demo questions and multi-step root-cause evidence queries.
3. Strict read-only query enforcement (rejects destructive keywords).
4. Error handling for empty queries, missing schemas, and malformed LLM outputs.
5. End-to-end integration flow from Intent Agent -> SQL Agent.
"""

import os
import sys
import unittest
from typing import Any, Dict, List, Optional
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from llm.base import BaseLLMClient
from models.schemas import DatabaseSchema, IntentOutput, SQLOutput, TableMetadata
from models.mock_schema import ECOMMERCE_SCHEMA, HRMS_SCHEMA, get_mock_schema_by_domain
from agents.intent_agent import IntentAgent
from agents.sql_agent import SQLAgent


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


class TestSQLAgentOffline(unittest.TestCase):
    """Offline unit tests verifying SQL generation, read-only enforcement, and schema validation."""

    def test_clean_sql_parsing_with_markdown_fences(self):
        canned = """```json
{
  "sql": "SELECT DATE_TRUNC('month', order_date) AS month, SUM(total_amount) AS total_sales FROM orders WHERE order_date >= NOW() - INTERVAL '1 year' GROUP BY 1 ORDER BY 1 ASC;",
  "tables_used": ["orders"],
  "columns_used": ["order_date", "total_amount"],
  "explanation": "Calculates monthly sales over the last year."
}
```"""
        agent = SQLAgent(llm_client=MockLLMClient(canned))
        intent = {
            "domain": "ecommerce",
            "analysis": "trend",
            "metric": "sales",
            "time_period": "last_year",
            "grouping": "month",
            "filters": [],
        }
        res = agent.generate_sql(
            question="Show monthly sales trend for the last year.",
            intent=intent,
            schema=ECOMMERCE_SCHEMA,
        )

        self.assertIsInstance(res, SQLOutput)
        self.assertTrue(res.sql.startswith("SELECT"))
        self.assertIn("orders", res.tables_used)
        self.assertTrue(res.is_read_only)

    def test_disallowed_mutation_keyword_raises_error(self):
        destructive_output = json.dumps({
            "sql": "DROP TABLE orders; SELECT * FROM products;",
            "tables_used": ["orders", "products"],
            "columns_used": ["*"],
            "explanation": "Destructive query.",
        })
        agent = SQLAgent(llm_client=MockLLMClient(destructive_output))
        with self.assertRaises(ValueError) as ctx:
            agent.generate_sql(
                question="Delete old orders",
                intent={"domain": "ecommerce", "analysis": "aggregate"},
                schema=ECOMMERCE_SCHEMA,
            )
        self.assertIn("read-only", str(ctx.exception).lower())

    def test_non_select_query_raises_error(self):
        insert_output = json.dumps({
            "sql": "INSERT INTO orders (total_amount) VALUES (100);",
            "tables_used": ["orders"],
            "columns_used": ["total_amount"],
            "explanation": "Insert statement.",
        })
        agent = SQLAgent(llm_client=MockLLMClient(insert_output))
        with self.assertRaises(ValueError) as ctx:
            agent.generate_sql(
                question="Insert order",
                intent={"domain": "ecommerce", "analysis": "aggregate"},
                schema=ECOMMERCE_SCHEMA,
            )
        self.assertIn("read-only", str(ctx.exception).lower())

    def test_missing_schema_raises_error(self):
        agent = SQLAgent(llm_client=MockLLMClient("{}"))
        with self.assertRaises(ValueError):
            agent.generate_sql(
                question="Show revenue",
                intent={"domain": "ecommerce", "analysis": "aggregate"},
                schema={"tables": {}},
            )

    def test_empty_question_raises_error(self):
        agent = SQLAgent(llm_client=MockLLMClient("{}"))
        with self.assertRaises(ValueError):
            agent.generate_sql(
                question="  ",
                intent={"domain": "ecommerce", "analysis": "aggregate"},
                schema=ECOMMERCE_SCHEMA,
            )

    def test_hrms_domain_routing(self):
        hrms_canned = json.dumps({
            "sql": "SELECT d.department_name, COUNT(e.employee_id) AS headcount FROM departments d JOIN employees e ON d.department_id = e.department_id GROUP BY d.department_name;",
            "tables_used": ["departments", "employees"],
            "columns_used": ["d.department_name", "e.employee_id", "d.department_id", "e.department_id"],
            "explanation": "Calculates employee count per department.",
        })
        agent = SQLAgent(llm_client=MockLLMClient(hrms_canned))
        intent = {
            "domain": "hr",
            "analysis": "distribution",
            "metric": "headcount",
            "grouping": "department",
            "filters": [],
        }
        res = agent.generate_sql(
            question="Show employee distribution by department.",
            intent=intent,
            schema=HRMS_SCHEMA,
        )
        self.assertTrue("employees" in res.tables_used or "departments" in res.tables_used)
        self.assertTrue(res.sql.upper().startswith("SELECT"))


def run_live_sql_tests():
    """Execute live tests with Intent Agent and SQL Agent against Groq API."""
    print("\n" + "=" * 80)
    print(" Running Live SQL Agent Tests against Groq API")
    print("=" * 80)

    try:
        intent_agent = IntentAgent()
        sql_agent = SQLAgent()
    except (ValueError, ImportError) as e:
        print(f"\n[SKIPPED LIVE TESTS] {e}")
        print("To run live Groq tests, install dependencies (`pip install -r requirements.txt`) and set GROQ_API_KEY in your .env file.\n")
        return

    # 1. Five Fixed Demo Questions
    demo_cases = [
        {
            "id": "DEMO-1 (E-Commerce Trend)",
            "question": "Show monthly sales trend for the last year.",
            "schema": ECOMMERCE_SCHEMA,
            "expected_tables": ["orders"],
            "expected_clauses": ["SELECT", "GROUP BY"],
        },
        {
            "id": "DEMO-2 (E-Commerce Breakdown / Join)",
            "question": "Show revenue by category.",
            "schema": ECOMMERCE_SCHEMA,
            "expected_tables": ["products"],
            "expected_clauses": ["SELECT", "GROUP BY"],
        },
        {
            "id": "DEMO-3 (E-Commerce Aggregate)",
            "question": "What is total revenue this month?",
            "schema": ECOMMERCE_SCHEMA,
            "expected_tables": ["orders"],
            "expected_clauses": ["SELECT"],
        },
        {
            "id": "DEMO-4 (HRMS Distribution)",
            "question": "Show employee distribution by department.",
            "schema": HRMS_SCHEMA,
            "expected_tables": ["employees"],
            "expected_clauses": ["SELECT", "GROUP BY"],
        },
    ]

    print("\n--- Part 1: Standard Demo Questions (Intent -> SQL) ---\n")
    for case in demo_cases:
        print(f"[{case['id']}]")
        print(f"  User Question : \"{case['question']}\"")

        # Step A: Intent Extraction
        intent = intent_agent.parse_intent(case["question"])
        print(f"  Extracted Intent : analysis='{intent.analysis}', metric='{intent.metric}', time='{intent.time_period}', grouping='{intent.grouping}'")

        # Step B: SQL Generation
        sql_res = sql_agent.generate_sql(
            question=case["question"],
            intent=intent,
            schema=case["schema"],
        )
        print(f"  Generated SQL    :\n    {sql_res.sql}")
        print(f"  Tables Used      : {sql_res.tables_used}")
        print(f"  Explanation      : {sql_res.explanation}\n")

        # Structural assertions
        sql_upper = sql_res.sql.upper()
        self_assert_select = sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")
        assert self_assert_select, f"Generated query does not start with SELECT/WITH: {sql_res.sql}"

        for clause in case["expected_clauses"]:
            assert clause in sql_upper, f"Expected clause '{clause}' not found in SQL: {sql_res.sql}"

        print(f"  [PASS] {case['id']} verified successfully.\n")

    # 2. Question 5: Root Cause Multi-Step Analytical Hypothesis Queries
    print("--- Part 2: Question 5 - Root-Cause Analysis Diagnostic Queries ---\n")
    print("Question: \"Why did sales decrease last month?\"\n")
    print("Note: Root-cause is a multi-step diagnostic workflow. Generating targeted evidence queries:\n")

    rca_hypotheses = [
        {
            "hypothesis": "Hypothesis 1: Month-over-Month Sales Comparison",
            "intent": IntentOutput(
                domain="ecommerce",
                analysis="trend",
                metric="sales",
                time_period="last_2_months",
                grouping="month",
                is_root_cause_query=True,
            ),
            "schema": ECOMMERCE_SCHEMA,
        },
        {
            "hypothesis": "Hypothesis 2: Sales Drop by Product Category",
            "intent": IntentOutput(
                domain="ecommerce",
                analysis="breakdown",
                metric="revenue",
                time_period="last_month",
                grouping="category",
                is_root_cause_query=True,
            ),
            "schema": ECOMMERCE_SCHEMA,
        },
        {
            "hypothesis": "Hypothesis 3: Spikes in Order Cancellation / Return Status",
            "intent": IntentOutput(
                domain="ecommerce",
                analysis="breakdown",
                metric="order_count",
                time_period="last_month",
                grouping="status",
                is_root_cause_query=True,
            ),
            "schema": ECOMMERCE_SCHEMA,
        },
    ]

    for hyp in rca_hypotheses:
        print(f"  [{hyp['hypothesis']}]")
        sql_res = sql_agent.generate_sql(
            question="Why did sales decrease last month?",
            intent=hyp["intent"],
            schema=hyp["schema"],
        )
        print(f"  Generated Evidence SQL:\n    {sql_res.sql}")
        print(f"  Tables Used: {sql_res.tables_used}")
        print(f"  Explanation: {sql_res.explanation}\n")
        assert sql_res.sql.upper().startswith("SELECT") or sql_res.sql.upper().startswith("WITH")
        print("  [PASS] Diagnostic query generated successfully.\n")

    # 3. Natural Language Variations / Generalization
    print("--- Part 3: Paraphrased Natural Language Variations ---\n")
    variations = [
        ("Plot month-by-month sales across the last 12 months.", ECOMMERCE_SCHEMA),
        ("Which product categories generated the highest earnings?", ECOMMERCE_SCHEMA),
        ("How many staff members work in each department?", HRMS_SCHEMA),
    ]

    for q, s in variations:
        print(f"  Variation Question: \"{q}\"")
        intent = intent_agent.parse_intent(q)
        sql_res = sql_agent.generate_sql(question=q, intent=intent, schema=s)
        print(f"  SQL:\n    {sql_res.sql}")
        assert sql_res.sql.upper().startswith("SELECT") or sql_res.sql.upper().startswith("WITH")
        print("  [PASS] Generalization verified.\n")

    print("=" * 80)
    print(" ALL SQL AGENT TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    # 1. Run offline unit tests
    suite = unittest.TestLoader().loadTestsFromTestCase(TestSQLAgentOffline)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if not result.wasSuccessful():
        sys.exit(1)

    # 2. Run live Groq tests if environment allows
    run_live_sql_tests()
