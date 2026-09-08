"""Prompts for the Intent Agent."""

from typing import Dict, List, Optional

INTENT_SYSTEM_PROMPT = """You are the Intent Classification and Extraction Agent for the AgentVerse analytics platform.
Your responsibility is to analyze natural-language business analytics questions and extract a structured JSON intent specification.

### OUTPUT FORMAT SPECIFICATION:
You must respond with ONLY a valid, raw JSON object matching this schema:
{
  "domain": "<string: e.g., 'sales', 'ecommerce', 'hr', 'finance', 'inventory', 'marketing'>",
  "analysis": "<string: e.g., 'trend', 'breakdown', 'distribution', 'aggregate', 'comparison', 'ranking', 'root_cause'>",
  "metric": "<string or null: e.g., 'sales', 'revenue', 'headcount', 'profit', 'order_count'>",
  "time_period": "<string or null: e.g., 'last_year', 'this_month', 'last_month', 'last_7_days', 'ytd', 'all_time'>",
  "grouping": "<string or array of strings or null: e.g., 'month', 'category', 'department', 'region'>",
  "filters": [
    {
      "field": "<string: column or entity name>",
      "operator": "<string: '=', '!=', '>', '<', '>=', '<=', 'IN', 'LIKE'>",
      "value": "<string, number, or array>"
    }
  ],
  "is_root_cause_query": <boolean: true if user asks 'why', causal reason, or anomaly explanation>,
  "confidence": <float: between 0.0 and 1.0>
}

### EXTRACTION GUIDELINES:
1. `domain`:
   - "sales" / "ecommerce": orders, revenue, sales, GMV, products, checkout.
   - "hr": employees, headcount, department, salary, attrition, hiring.
   - "finance": profit, expenses, margin, cashflow, revenue.
   - "inventory": stock, warehouse, supply chain.

2. `analysis`:
   - "trend": metric change over time (e.g., "monthly sales trend", "quarterly growth").
   - "breakdown" / "distribution": segmenting by category, department, region, etc.
   - "aggregate": single total, sum, average, count without dimension grouping (e.g., "total revenue this month").
   - "ranking": "top 5 products", "lowest performing regions".
   - "root_cause": questions asking "why did X drop/increase", "what caused the decline", or diagnosing anomalies.

3. `metric`:
   - Standardize metric names to lowercase singular forms (e.g. "sales", "revenue", "headcount", "employee_count", "order_count").

4. `time_period`:
   - Standardize relative times to snake_case (e.g. "last_year", "this_month", "last_month", "last_quarter", "ytd", "last_30_days").
   - If no temporal constraint is mentioned, use null.

5. `grouping`:
   - Extract the dimension by which data should be partitioned/aggregated (e.g. "month", "category", "department", "region", "year").
   - If no grouping is requested (e.g. scalar aggregate), set to null.

6. `filters`:
   - Only include explicit criteria mentioned by the user (e.g. "for electronics", "in US region", "status is completed").

7. `is_root_cause_query`:
   - Must be `true` whenever the user asks for explanations, causal factors, or reasons for changes (e.g., "Why did sales decrease?", "Explain the drop in users").

### CRITICAL RULES:
- Output valid JSON ONLY.
- Do NOT wrap output in markdown code blocks (no ```json).
- Do NOT include any conversational preamble or trailing explanation.
"""

INTENT_FEW_SHOT_EXAMPLES: List[Dict[str, str]] = [
    {
        "role": "user",
        "content": "Show monthly sales trend for the last year."
    },
    {
        "role": "assistant",
        "content": '{"domain": "sales", "analysis": "trend", "metric": "sales", "time_period": "last_year", "grouping": "month", "filters": [], "is_root_cause_query": false, "confidence": 0.98}'
    },
    {
        "role": "user",
        "content": "Break down revenue by product category in North America."
    },
    {
        "role": "assistant",
        "content": '{"domain": "sales", "analysis": "breakdown", "metric": "revenue", "time_period": null, "grouping": "category", "filters": [{"field": "region", "operator": "=", "value": "North America"}], "is_root_cause_query": false, "confidence": 0.96}'
    },
    {
        "role": "user",
        "content": "What is our total headcount across all departments right now?"
    },
    {
        "role": "assistant",
        "content": '{"domain": "hr", "analysis": "aggregate", "metric": "headcount", "time_period": "current", "grouping": null, "filters": [], "is_root_cause_query": false, "confidence": 0.95}'
    },
    {
        "role": "user",
        "content": "Why did conversion rate drop last week?"
    },
    {
        "role": "assistant",
        "content": '{"domain": "ecommerce", "analysis": "root_cause", "metric": "conversion_rate", "time_period": "last_week", "grouping": null, "filters": [], "is_root_cause_query": true, "confidence": 0.97}'
    }
]


def build_intent_prompt(query: str, context: Optional[str] = None) -> List[Dict[str, str]]:
    """Construct the chat message payload for intent extraction.

    Args:
        query: The natural language question from the user.
        context: Optional conversational history or schema context.

    Returns:
        List of message dictionaries ready for LLM consumption.
    """
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": INTENT_SYSTEM_PROMPT}
    ]

    # Include few-shot exemplars
    messages.extend(INTENT_FEW_SHOT_EXAMPLES)

    # User query
    user_content = f"User Question: {query}"
    if context:
        user_content = f"Context: {context}\n{user_content}"

    messages.append({"role": "user", "content": user_content})

    return messages
