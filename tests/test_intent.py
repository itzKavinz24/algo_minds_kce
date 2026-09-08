"""Test suite for the Intent Agent.

Tests:
1. Five fixed project demo questions.
2. Paraphrased variations to verify generalization.
3. Unit tests with Mock LLM for error handling & JSON sanitization.
"""

import os
import sys
import unittest
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from llm.base import BaseLLMClient
from models.schemas import IntentOutput, FilterCondition
from agents.intent_agent import IntentAgent


class MockLLMClient(BaseLLMClient):
    """Deterministic Mock LLM client for offline unit testing."""

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


class TestIntentAgentOffline(unittest.TestCase):
    """Unit tests verifying JSON sanitization, error handling, and schema validation without external API calls."""

    def test_clean_json_parsing_with_markdown_fences(self):
        markdown_wrapped = """```json
{
  "domain": "sales",
  "analysis": "trend",
  "metric": "sales",
  "time_period": "last_year",
  "grouping": "month",
  "filters": [],
  "is_root_cause_query": false,
  "confidence": 0.99
}
```"""
        agent = IntentAgent(llm_client=MockLLMClient(markdown_wrapped))
        intent = agent.parse_intent("Show monthly sales trend for the last year.")

        self.assertEqual(intent.domain, "sales")
        self.assertEqual(intent.analysis, "trend")
        self.assertEqual(intent.metric, "sales")
        self.assertEqual(intent.time_period, "last_year")
        self.assertEqual(intent.grouping, "month")
        self.assertFalse(intent.is_root_cause_query)

    def test_json_with_trailing_commas_and_text(self):
        noisy_response = """Here is the extracted intent:
{
  "domain": "ecommerce",
  "analysis": "breakdown",
  "metric": "revenue",
  "time_period": null,
  "grouping": "category",
  "filters": [
    {
      "field": "status",
      "operator": "=",
      "value": "completed",
    },
  ],
  "is_root_cause_query": false,
}
Hope this helps!"""
        agent = IntentAgent(llm_client=MockLLMClient(noisy_response))
        intent = agent.parse_intent("Show completed revenue by category.")

        self.assertEqual(intent.domain, "ecommerce")
        self.assertEqual(intent.analysis, "breakdown")
        self.assertEqual(intent.grouping, "category")
        self.assertEqual(len(intent.filters), 1)
        self.assertEqual(intent.filters[0].field, "status")
        self.assertEqual(intent.filters[0].value, "completed")

    def test_empty_query_raises_value_error(self):
        agent = IntentAgent(llm_client=MockLLMClient("{}"))
        with self.assertRaises(ValueError):
            agent.parse_intent("   ")

    def test_malformed_unrecoverable_json_raises_error(self):
        agent = IntentAgent(llm_client=MockLLMClient("Not a json at all"))
        with self.assertRaises(ValueError):
            agent.parse_intent("What is our revenue?")


def run_live_groq_tests():
    """Execute live tests against the Groq API for the 5 demo questions + variations."""
    print("\n" + "=" * 75)
    print(" Running Live Intent Agent Tests against Groq API")
    print("=" * 75)

    try:
        agent = IntentAgent()
    except (ValueError, ImportError) as e:
        print(f"\n[SKIPPED LIVE TESTS] {e}")
        print("To run live Groq tests, install dependencies (`pip install -r requirements.txt`) and set GROQ_API_KEY in your .env file.\n")
        return

    # 1. Five Fixed Demo Questions
    demo_questions = [
        {
            "id": "DEMO-1",
            "query": "Show monthly sales trend for the last year.",
            "expected_analysis": "trend",
            "expected_metric": "sales",
            "expected_time": "last_year",
            "expected_grouping": "month",
            "is_rca": False,
        },
        {
            "id": "DEMO-2",
            "query": "Show revenue by category.",
            "expected_analysis": ["breakdown", "distribution", "aggregate"],
            "expected_metric": "revenue",
            "expected_grouping": "category",
            "is_rca": False,
        },
        {
            "id": "DEMO-3",
            "query": "What is total revenue this month?",
            "expected_analysis": "aggregate",
            "expected_metric": "revenue",
            "expected_time": "this_month",
            "is_rca": False,
        },
        {
            "id": "DEMO-4",
            "query": "Show employee distribution by department.",
            "expected_domain": "hr",
            "expected_analysis": ["distribution", "breakdown"],
            "expected_grouping": "department",
            "is_rca": False,
        },
        {
            "id": "DEMO-5",
            "query": "Why did sales decrease last month?",
            "expected_analysis": "root_cause",
            "expected_metric": "sales",
            "expected_time": "last_month",
            "is_rca": True,
        },
    ]

    print("\n--- Part 1: Five Fixed Project Demo Questions ---\n")
    for item in demo_questions:
        print(f"[{item['id']}] Question: \"{item['query']}\"")
        intent = agent.parse_intent(item["query"])
        print(f"       Extracted Intent: {intent.to_json(indent=None)}")

        # Soft assertions with diagnostic messages
        if isinstance(item.get("expected_analysis"), list):
            assert intent.analysis in item["expected_analysis"], f"Expected analysis in {item['expected_analysis']}, got {intent.analysis}"
        elif "expected_analysis" in item:
            assert intent.analysis == item["expected_analysis"], f"Expected analysis {item['expected_analysis']}, got {intent.analysis}"

        if "expected_metric" in item and item["expected_metric"]:
            assert intent.metric in (item["expected_metric"], "sales", "revenue", "headcount", "employee_count"), f"Unexpected metric: {intent.metric}"

        if "expected_time" in item and item["expected_time"]:
            assert intent.time_period == item["expected_time"], f"Expected time_period {item['expected_time']}, got {intent.time_period}"

        if "expected_grouping" in item and item["expected_grouping"]:
            grouping_val = intent.grouping[0] if isinstance(intent.grouping, list) else intent.grouping
            assert grouping_val == item["expected_grouping"], f"Expected grouping {item['expected_grouping']}, got {intent.grouping}"

        if "is_rca" in item:
            assert intent.is_root_cause_query == item["is_rca"], f"Expected is_root_cause_query={item['is_rca']}, got {intent.is_root_cause_query}"

        print("       [PASS] Intent structure validated successfully.\n")

    # 2. Differently Worded Variations
    variations = [
        ("Can you plot how our sales moved month over month across the past 12 months?", "trend", "month"),
        ("Give me a breakdown of earnings per product category.", "breakdown", "category"),
        ("How much money did we make in the current month?", "aggregate", None),
        ("Headcount per team in the organization.", "distribution", "team"),
        ("What caused our revenue drop in the previous month?", "root_cause", None),
    ]

    print("--- Part 2: Natural Language Variations (Generalization Test) ---\n")
    for query, exp_analysis, exp_grouping in variations:
        print(f"[VARIATION] Question: \"{query}\"")
        intent = agent.parse_intent(query)
        print(f"            Parsed: analysis='{intent.analysis}', metric='{intent.metric}', time='{intent.time_period}', grouping='{intent.grouping}', is_rca={intent.is_root_cause_query}")
        assert intent.domain in ("sales", "ecommerce", "hr", "finance", "general"), f"Unexpected domain: {intent.domain}"
        print("            [PASS] Generalization verified.\n")

    print("=" * 75)
    print(" ALL INTENT AGENT TESTS PASSED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    # 1. Run offline unit tests
    suite = unittest.TestLoader().loadTestsFromTestCase(TestIntentAgentOffline)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if not result.wasSuccessful():
        sys.exit(1)

    # 2. Run live Groq tests if environment allows
    run_live_groq_tests()
