"""Prompts for the Root-Cause Analysis (RCA) Agent."""

from typing import Any, Dict, List, Optional
import json

HYPOTHESIS_SYSTEM_PROMPT = """You are the Root-Cause Diagnostic Agent for the AgentVerse analytics platform.
Your task is to analyze an observed performance drop or anomaly and generate plausible, testable hypotheses with precise evidence query requests.

### GUIDELINES:
1. Analyze the baseline decline (metric, timeframe, percentage drop).
2. Generate 2 to 4 distinct, plausible hypotheses based on the business domain and schema dimensions (e.g. category drop, regional decline, order volume vs basket size change, cancellation spike).
3. For each hypothesis, define concrete `evidence_queries` that specify the exact comparative question and analytical purpose.

### OUTPUT JSON SCHEMA:
Respond with ONLY a raw JSON array of hypothesis objects:
[
  {
    "id": "<string: snake_case identifier e.g. 'category_decline'>",
    "description": "<string: clear explanation of the hypothesis>",
    "dimension": "<string: e.g. 'category', 'region', 'volume_vs_aov', 'cancellation'>",
    "evidence_queries": [
      {
        "hypothesis_id": "<string: matching hypothesis id>",
        "question": "<string: specific analytical question for SQL Agent>",
        "purpose": "<string: what this query intends to prove or disprove>"
      }
    ]
  }
]

Do NOT wrap the JSON in markdown code fences.
Do NOT include conversational preamble or trailing text.
"""

HYPOTHESIS_FEW_SHOT_EXAMPLES: List[Dict[str, str]] = [
    {
        "role": "user",
        "content": (
            "Question: Why did sales decrease last month?\n"
            "Baseline: Total sales declined from $1,000,000.00 to $820,000.00 (-18.00% / -$180,000.00).\n"
            "Domain: ecommerce\n"
            "Schema Tables: orders, order_items, products, customers, payments"
        )
    },
    {
        "role": "assistant",
        "content": json.dumps([
            {
                "id": "category_decline",
                "description": "Sales decline was concentrated in specific high-revenue product categories.",
                "dimension": "category",
                "evidence_queries": [
                    {
                        "hypothesis_id": "category_decline",
                        "question": "Compare sales and revenue by product category between the previous month and last month.",
                        "purpose": "Identify if a specific product category suffered a disproportionate revenue decline."
                    }
                ]
            },
            {
                "id": "regional_decline",
                "description": "Geographical shock or regional demand drops caused the overall decline.",
                "dimension": "region",
                "evidence_queries": [
                    {
                        "hypothesis_id": "regional_decline",
                        "question": "Compare revenue across customer regions between the previous month and last month.",
                        "purpose": "Determine if the drop was localized to specific regions or uniform across all markets."
                    }
                ]
            },
            {
                "id": "volume_vs_aov_shift",
                "description": "Decline was driven by lower transaction volume versus reduced basket size (Average Order Value).",
                "dimension": "volume_vs_aov",
                "evidence_queries": [
                    {
                        "hypothesis_id": "volume_vs_aov_shift",
                        "question": "Compare total order count and average order value between previous month and last month.",
                        "purpose": "Distinguish whether customer purchasing frequency or spend per order caused the decline."
                    }
                ]
            },
            {
                "id": "cancellation_rate_increase",
                "description": "A surge in order cancellations or payment failures eroded net revenue.",
                "dimension": "cancellation",
                "evidence_queries": [
                    {
                        "hypothesis_id": "cancellation_rate_increase",
                        "question": "Compare order cancellation and return rates between the previous month and last month.",
                        "purpose": "Check if fulfillment issues or payment drop-offs inflated gross revenue losses."
                    }
                ]
            }
        ])
    }
]

RCA_SYNTHESIS_SYSTEM_PROMPT = """You are the Root-Cause Analysis Synthesis Agent for the AgentVerse platform.
Your task is to review the baseline decline and all evaluated evidence results (including deterministic mathematical contribution calculations), classify hypothesis support levels, and identify the primary root-cause contributor.

### EVIDENCE CLASSIFICATION RULES:
For each hypothesis, evaluate the evidence and assign a `support` level:
- "strongly_supported": The factor directly accounts for a majority (>50%) of the total net decline with significant drop percentage.
- "supported": The factor accounts for a notable portion of the decline but is not the sole driver.
- "weakly_supported": Minor decline or small contribution (<10%).
- "unsupported": Data shows uniform performance, stability, or growth in this dimension.
- "insufficient_evidence": Query returned no data or inconclusive metrics.

### CAUSAL REASONING PRINCIPLES:
1. Ground every claim strictly in the mathematical numbers provided in `Evaluated Evidence`.
2. Distinguish contribution from unproven causation: Use terms like "primary contributor" or "strongest supported factor".
3. Provide concrete, actionable business recommendations targeted at addressing the identified root cause.

### OUTPUT JSON SCHEMA:
Respond with ONLY a raw JSON object:
{
  "primary_contributor": "<string: name/summary of the strongest supported factor, e.g., 'Electronics category sales decline'>",
  "findings_summary": "<string: 2-3 sentence executive synthesis explaining the root cause based on evidence>",
  "confidence": "<string: 'high' | 'medium' | 'low' | 'inconclusive'>",
  "evidence": [
    {
      "hypothesis_id": "<string>",
      "finding": "<string: specific findings and numbers>",
      "support": "<string: 'strongly_supported' | 'supported' | 'weakly_supported' | 'unsupported' | 'insufficient_evidence'>",
      "contribution_percent": <float or null>
    }
  ],
  "recommendations": [
    "<string: actionable recommendation 1>",
    "<string: actionable recommendation 2>"
  ]
}

Do NOT wrap the JSON in markdown code fences.
Do NOT include conversational text.
"""


def build_hypothesis_prompt(
    question: str,
    intent_dict: Dict[str, Any],
    baseline_summary: str,
    schema_text: Optional[str] = None,
    context: Optional[str] = None,
) -> List[Dict[str, str]]:
    """Construct prompt messages for generating diagnostic hypotheses."""
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": HYPOTHESIS_SYSTEM_PROMPT}
    ]
    messages.extend(HYPOTHESIS_FEW_SHOT_EXAMPLES)

    user_content = (
        f"Question: {question}\n"
        f"Intent: {json.dumps(intent_dict)}\n"
        f"Baseline: {baseline_summary}\n"
        f"Domain: {intent_dict.get('domain', 'general')}\n"
    )
    if schema_text:
        user_content += f"Schema Context:\n{schema_text}\n"
    if context:
        user_content += f"Additional Context: {context}\n"

    messages.append({"role": "user", "content": user_content})
    return messages


def build_synthesis_prompt(
    question: str,
    baseline_dict: Dict[str, Any],
    hypotheses_dict: List[Dict[str, Any]],
    evaluated_evidence: List[Dict[str, Any]],
    context: Optional[str] = None,
) -> List[Dict[str, str]]:
    """Construct prompt messages for synthesizing root-cause findings."""
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": RCA_SYNTHESIS_SYSTEM_PROMPT}
    ]

    user_content = (
        f"Question: {question}\n"
        f"Baseline Decline: {json.dumps(baseline_dict)}\n"
        f"Hypotheses Formulated: {json.dumps(hypotheses_dict)}\n"
        f"Evaluated Evidence & Deterministic Calculations: {json.dumps(evaluated_evidence, indent=2)}"
    )
    if context:
        user_content += f"\nContext: {context}"

    messages.append({"role": "user", "content": user_content})
    return messages
