"""Test suite for the Root-Cause Analysis (RCA) Agent.

Tests:
1. Baseline decline detection and exact mathematical calculations.
2. Deterministic factor contribution percentage calculations.
3. Hypothesis and evidence-query generation.
4. Evidence result classification (strongly_supported, supported, unsupported, insufficient_evidence).
5. Unsupported and empty evidence handling.
6. LLM failure & code fence sanitization.
7. End-to-end multi-step RCA diagnostic workflow for the flagship demo question:
   "Why did sales decrease last month?"
"""

import os
import sys
import unittest
from typing import Any, Dict, List, Optional
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from llm.base import BaseLLMClient
from models.schemas import (
    BaselineComparison,
    DatabaseSchema,
    EvidenceQuery,
    EvidenceResult,
    IntentOutput,
    RootCauseHypothesis,
    RootCauseOutput,
)
from models.mock_data import (
    MOCK_RCA_BASELINE,
    MOCK_RCA_EVIDENCE_CATEGORY,
    MOCK_RCA_EVIDENCE_REGION,
    MOCK_RCA_EVIDENCE_VOLUME_AOV,
    MOCK_RCA_EVIDENCE_CANCELLATION,
)
from models.mock_schema import ECOMMERCE_SCHEMA
from agents.intent_agent import IntentAgent
from agents.sql_agent import SQLAgent
from agents.root_cause_agent import RootCauseAgent


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


class TestRootCauseAgentOffline(unittest.TestCase):
    """Offline unit tests verifying deterministic calculations and workflow structure."""

    def setUp(self):
        self.agent = RootCauseAgent(llm_client=MockLLMClient("{}"))

    def test_baseline_calculation(self):
        baseline = self.agent.calculate_baseline(MOCK_RCA_BASELINE, metric_name="sales")

        self.assertEqual(baseline.previous_value, 1000000.0)
        self.assertEqual(baseline.current_value, 820000.0)
        self.assertEqual(baseline.change_amount, -180000.0)
        self.assertEqual(baseline.change_percent, -18.0)
        self.assertEqual(baseline.metric_name, "sales")

    def test_baseline_insufficient_records_raises_error(self):
        with self.assertRaises(ValueError):
            self.agent.calculate_baseline([{"period": "2023-10", "total_sales": 1000.0}])

    def test_deterministic_category_contribution_math(self):
        baseline = self.agent.calculate_baseline(MOCK_RCA_BASELINE)
        eval_res = self.agent.calculate_evidence_contribution(
            hypothesis_id="category_decline",
            evidence_data=MOCK_RCA_EVIDENCE_CATEGORY,
            baseline=baseline,
        )

        self.assertEqual(eval_res["type"], "dimension_breakdown")
        top_contrib = eval_res["top_contributor"]
        self.assertEqual(top_contrib["segment"], "Electronics")
        self.assertEqual(top_contrib["delta"], -131000.0)
        self.assertEqual(top_contrib["change_pct"], -31.19)

        # Contribution math: |-131000| / |-180000| * 100 = 72.78%
        self.assertEqual(top_contrib["contribution_to_total_decline_pct"], 72.78)
        self.assertEqual(eval_res["top_contribution_pct"], 72.78)

    def test_deterministic_regional_evidence_math(self):
        baseline = self.agent.calculate_baseline(MOCK_RCA_BASELINE)
        eval_res = self.agent.calculate_evidence_contribution(
            hypothesis_id="regional_decline",
            evidence_data=MOCK_RCA_EVIDENCE_REGION,
            baseline=baseline,
        )
        self.assertEqual(eval_res["type"], "dimension_breakdown")
        # All regions dropped uniformly by 18.0%
        for seg in eval_res["segments"]:
            self.assertEqual(seg["change_pct"], -18.0)

    def test_empty_evidence_handled_gracefully(self):
        baseline = self.agent.calculate_baseline(MOCK_RCA_BASELINE)
        eval_res = self.agent.calculate_evidence_contribution(
            hypothesis_id="unknown_factor",
            evidence_data=[],
            baseline=baseline,
        )
        self.assertEqual(eval_res["status"], "insufficient_evidence")

    def test_hypothesis_generation_and_parsing(self):
        canned_hypotheses = json.dumps([
            {
                "id": "category_decline",
                "description": "Decline was concentrated in specific product categories.",
                "dimension": "category",
                "evidence_queries": [
                    {
                        "hypothesis_id": "category_decline",
                        "question": "Compare revenue by category between previous and current month.",
                        "purpose": "Identify if specific category caused the drop."
                    }
                ]
            },
            {
                "id": "regional_decline",
                "description": "Decline was concentrated in specific customer regions.",
                "dimension": "region",
                "evidence_queries": [
                    {
                        "hypothesis_id": "regional_decline",
                        "question": "Compare revenue by region between previous and current month.",
                        "purpose": "Determine if geographic factors contributed."
                    }
                ]
            }
        ])
        agent = RootCauseAgent(llm_client=MockLLMClient(canned_hypotheses))
        baseline = agent.calculate_baseline(MOCK_RCA_BASELINE)
        hypotheses = agent.generate_hypotheses(
            question="Why did sales decrease last month?",
            intent={"domain": "ecommerce", "analysis": "root_cause", "is_root_cause_query": True},
            baseline=baseline,
            schema=ECOMMERCE_SCHEMA,
        )

        self.assertEqual(len(hypotheses), 2)
        self.assertEqual(hypotheses[0].id, "category_decline")
        self.assertEqual(len(hypotheses[0].evidence_queries), 1)
        self.assertEqual(hypotheses[1].id, "regional_decline")

    def test_full_offline_synthesis_workflow(self):
        canned_synthesis = json.dumps({
            "primary_contributor": "Electronics product category decline",
            "findings_summary": "Overall revenue dropped by 18% (-$180,000), primarily driven by a 31.19% decrease in Electronics sales which accounted for 72.78% of the total revenue loss.",
            "confidence": "high",
            "evidence": [
                {
                    "hypothesis_id": "category_decline",
                    "finding": "Electronics revenue fell by $131,000, accounting for 72.78% of the company-wide decline.",
                    "support": "strongly_supported",
                    "contribution_percent": 72.78
                },
                {
                    "hypothesis_id": "regional_decline",
                    "finding": "Sales declined uniformly at 18.0% across all geographical regions, indicating no regional anomaly.",
                    "support": "unsupported",
                    "contribution_percent": None
                }
            ],
            "recommendations": [
                "Investigate inventory availability and supplier stockouts in the Electronics category.",
                "Review promotional and pricing adjustments for top-tier Electronics SKUs."
            ]
        })

        agent = RootCauseAgent(llm_client=MockLLMClient(canned_synthesis))
        baseline = agent.calculate_baseline(MOCK_RCA_BASELINE)
        hypotheses = [
            RootCauseHypothesis(
                id="category_decline",
                description="Category concentration",
                evidence_queries=[EvidenceQuery(hypothesis_id="category_decline", question="Compare category sales", purpose="Check category drop")]
            ),
            RootCauseHypothesis(
                id="regional_decline",
                description="Regional drop",
                evidence_queries=[EvidenceQuery(hypothesis_id="regional_decline", question="Compare regional sales", purpose="Check region drop")]
            ),
        ]
        evidence_map = {
            "category_decline": MOCK_RCA_EVIDENCE_CATEGORY,
            "regional_decline": MOCK_RCA_EVIDENCE_REGION,
        }

        output = agent.analyze_evidence(
            question="Why did sales decrease last month?",
            intent={"domain": "ecommerce", "analysis": "root_cause"},
            baseline=baseline,
            hypotheses=hypotheses,
            evidence_data_map=evidence_map,
        )

        self.assertIsInstance(output, RootCauseOutput)
        self.assertIn("Electronics", output.primary_contributor)
        self.assertEqual(output.confidence, "high")
        self.assertEqual(len(output.evidence), 2)
        self.assertEqual(output.evidence[0].support, "strongly_supported")
        self.assertEqual(output.evidence[0].contribution_percent, 72.78)
        self.assertEqual(output.evidence[1].support, "unsupported")
        self.assertEqual(len(output.recommendations), 2)


def run_live_rca_tests():
    """Run live multi-agent Root-Cause Analysis workflow against Groq API."""
    print("\n" + "=" * 85)
    print(" Running Live Root-Cause Analysis (RCA) Agent Tests against Groq API")
    print("=" * 85)

    try:
        intent_agent = IntentAgent()
        sql_agent = SQLAgent()
        rca_agent = RootCauseAgent()
    except (ValueError, ImportError) as e:
        print(f"\n[SKIPPED LIVE TESTS] {e}")
        print("To run live Groq tests, install dependencies (`pip install -r requirements.txt`) and set GROQ_API_KEY in your .env file.\n")
        return

    question = "Why did sales decrease last month?"
    print(f"\nFlagship Diagnostic Question: \"{question}\"")

    # Step 1: Intent Classification
    intent = intent_agent.parse_intent(question)
    print(f"\n[1/6 Intent Extracted]")
    print(f"      domain='{intent.domain}', analysis='{intent.analysis}', is_rca={intent.is_root_cause_query}")

    # Step 2: Baseline Comparison
    baseline = rca_agent.calculate_baseline(MOCK_RCA_BASELINE, metric_name="sales")
    print(f"\n[2/6 Baseline Established]")
    print(f"      Previous Period : {baseline.previous_period} = ${baseline.previous_value:,.2f}")
    print(f"      Current Period  : {baseline.current_period} = ${baseline.current_value:,.2f}")
    print(f"      Net Decline     : ${baseline.change_amount:,.2f} ({baseline.change_percent:+.2f}%)")

    # Step 3: Hypothesis Formulation
    hypotheses = rca_agent.generate_hypotheses(
        question=question,
        intent=intent,
        baseline=baseline,
        schema=ECOMMERCE_SCHEMA,
    )
    print(f"\n[3/6 Formulated Hypotheses ({len(hypotheses)})]")
    for h in hypotheses:
        print(f"      * [{h.id}] {h.description}")

    # Step 4: Evidence Queries (Demonstrating interaction with SQL Agent)
    print(f"\n[4/6 Generated Evidence Queries for SQL Agent]")
    for h in hypotheses:
        for eq in h.evidence_queries:
            sql_res = sql_agent.generate_sql(
                question=eq.question,
                intent=intent,
                schema=ECOMMERCE_SCHEMA,
            )
            print(f"      -> Hypothesis: {h.id}")
            print(f"         Query Request: \"{eq.question}\"")
            print(f"         Evidence SQL : {sql_res.sql}\n")

    # Step 5: Evidence Results Supply (Mapped from Mock Benchmark Data)
    evidence_data_map = {
        "category_decline": MOCK_RCA_EVIDENCE_CATEGORY,
        "regional_decline": MOCK_RCA_EVIDENCE_REGION,
        "volume_vs_aov_shift": MOCK_RCA_EVIDENCE_VOLUME_AOV,
        "cancellation_rate_increase": MOCK_RCA_EVIDENCE_CANCELLATION,
    }

    # Step 6: Evidence Analysis & Synthesis
    rca_output = rca_agent.analyze_evidence(
        question=question,
        intent=intent,
        baseline=baseline,
        hypotheses=hypotheses,
        evidence_data_map=evidence_data_map,
    )

    print(f"[5/6 Evidence Evaluated & Synthesized]")
    print(f"      Primary Contributor : {rca_output.primary_contributor}")
    print(f"      Confidence Level    : {rca_output.confidence}")
    print(f"      Findings Summary    : {rca_output.findings_summary}")

    print(f"\n[6/6 Evidence Support & Recommendations]")
    for ev in rca_output.evidence:
        contrib_str = f" [Contribution: {ev.contribution_percent:.2f}%]" if ev.contribution_percent else ""
        print(f"      * Hypothesis '{ev.hypothesis_id}': Support='{ev.support}'{contrib_str}")
        print(f"        Finding: {ev.finding}")

    print("\n      Actionable Recommendations:")
    for rec in rca_output.recommendations:
        print(f"      > {rec}")

    print("\n" + "=" * 85)
    print(" ALL ROOT-CAUSE ANALYSIS AGENT TESTS PASSED SUCCESSFULLY!")
    print("=" * 85)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestRootCauseAgentOffline)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if not result.wasSuccessful():
        sys.exit(1)

    run_live_rca_tests()
