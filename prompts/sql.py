"""Prompts for the SQL Agent."""

from typing import Any, Dict, List, Optional
import json

SQL_SYSTEM_PROMPT = """You are the SQL Generation Agent for the AgentVerse analytics platform.
Your task is to generate clean, accurate, efficient, and strictly READ-ONLY SQL queries based on:
1. The user's original question
2. The structured Intent extracted by the Intent Agent
3. The provided database schema and relationships

### STRICT CONSTRAINTS & SECURITY RULES:
1. READ-ONLY QUERIES ONLY:
   - You must generate ONLY `SELECT` or `WITH ... SELECT` queries.
   - NEVER generate `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, or any data/schema modification statements.
2. STRICT SCHEMA COMPLIANCE:
   - You must use ONLY the tables and columns present in the provided schema metadata.
   - NEVER invent or assume table or column names that are not in the provided schema.
   - Use explicit table aliases or table prefixes for clarity.
3. SCHEMA RELATIONSHIPS:
   - When joins are required, join tables ONLY along the relationships specified in the metadata.
4. ADHERENCE TO INTENT:
   - Calculate the requested `metric` using appropriate SQL aggregate functions (e.g., `SUM()`, `COUNT()`, `AVG()`).
   - Group by the requested `grouping` dimension using `GROUP BY`.
   - Apply `time_period` constraints and `filters` in the `WHERE` clause.
   - For time series/trend analysis, order chronologically (e.g., `ORDER BY 1 ASC`).
   - For categorical breakdowns, order by the aggregate metric descending (e.g., `ORDER BY 2 DESC`).
5. NO UNNECESSARY SELECT *:
   - Select only the requested grouping dimensions and aggregate metrics with clean aliases.

### OUTPUT FORMAT:
Respond with ONLY a valid, raw JSON object matching this schema:
{
  "sql": "<string: formatted, valid SQL query>",
  "tables_used": ["<string: table_name_1>", "<string: table_name_2>"],
  "columns_used": ["<string: col_1>", "<string: col_2>"],
  "explanation": "<string: brief explanation of the query logic>"
}

Do NOT wrap the output in markdown code blocks.
Do NOT include conversational text before or after the JSON.
"""

SQL_FEW_SHOT_EXAMPLES: List[Dict[str, str]] = [
    {
        "role": "user",
        "content": (
            "Question: Show monthly sales trend for the last year.\n"
            "Intent: {\"domain\": \"ecommerce\", \"analysis\": \"trend\", \"metric\": \"sales\", \"time_period\": \"last_year\", \"grouping\": \"month\", \"filters\": []}\n"
            "Schema:\n"
            "Available Database Tables & Columns:\n"
            "- Table 'orders': columns = [order_id, customer_id, order_date, total_amount, status]\n"
            "Relationships:\n"
            "- orders.customer_id = customers.customer_id"
        )
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "sql": "SELECT DATE_TRUNC('month', order_date) AS month, SUM(total_amount) AS total_sales FROM orders WHERE order_date >= NOW() - INTERVAL '1 year' AND status != 'cancelled' GROUP BY DATE_TRUNC('month', order_date) ORDER BY month ASC;",
            "tables_used": ["orders"],
            "columns_used": ["order_date", "total_amount", "status"],
            "explanation": "Aggregates total sales by month over the past 12 months, excluding cancelled orders."
        })
    },
    {
        "role": "user",
        "content": (
            "Question: Show revenue by category.\n"
            "Intent: {\"domain\": \"ecommerce\", \"analysis\": \"breakdown\", \"metric\": \"revenue\", \"time_period\": null, \"grouping\": \"category\", \"filters\": []}\n"
            "Schema:\n"
            "Available Database Tables & Columns:\n"
            "- Table 'products': columns = [product_id, product_name, category, price, cost]\n"
            "- Table 'orders': columns = [order_id, customer_id, order_date, total_amount, status]\n"
            "- Table 'order_items': columns = [item_id, order_id, product_id, quantity, unit_price]\n"
            "Relationships:\n"
            "- order_items.order_id = orders.order_id\n"
            "- order_items.product_id = products.product_id"
        )
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "sql": "SELECT p.category, SUM(oi.quantity * oi.unit_price) AS total_revenue FROM products p JOIN order_items oi ON p.product_id = oi.product_id JOIN orders o ON oi.order_id = o.order_id WHERE o.status = 'completed' GROUP BY p.category ORDER BY total_revenue DESC;",
            "tables_used": ["products", "order_items", "orders"],
            "columns_used": ["p.category", "p.product_id", "oi.product_id", "oi.order_id", "oi.quantity", "oi.unit_price", "o.order_id", "o.status"],
            "explanation": "Joins products, order_items, and orders to compute total revenue grouped by product category."
        })
    },
    {
        "role": "user",
        "content": (
            "Question: Show employee distribution by department.\n"
            "Intent: {\"domain\": \"hr\", \"analysis\": \"distribution\", \"metric\": \"headcount\", \"time_period\": null, \"grouping\": \"department\", \"filters\": []}\n"
            "Schema:\n"
            "Available Database Tables & Columns:\n"
            "- Table 'employees': columns = [employee_id, first_name, last_name, email, department_id, role, salary, hire_date, status]\n"
            "- Table 'departments': columns = [department_id, department_name, manager_id, location]\n"
            "Relationships:\n"
            "- employees.department_id = departments.department_id"
        )
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "sql": "SELECT d.department_name, COUNT(e.employee_id) AS employee_count FROM departments d LEFT JOIN employees e ON d.department_id = e.department_id WHERE e.status = 'active' OR e.status IS NULL GROUP BY d.department_name ORDER BY employee_count DESC;",
            "tables_used": ["departments", "employees"],
            "columns_used": ["d.department_name", "d.department_id", "e.department_id", "e.employee_id", "e.status"],
            "explanation": "Groups active employees by department name to determine headcount distribution."
        })
    }
]


def build_sql_prompt(
    question: str,
    intent_dict: Dict[str, Any],
    schema_text: str,
    context: Optional[str] = None,
) -> List[Dict[str, str]]:
    """Construct the chat messages payload for SQL generation.

    Args:
        question: Original natural language question.
        intent_dict: Structured dictionary from IntentOutput.
        schema_text: Formatted schema string.
        context: Optional additional context.

    Returns:
        List of message dictionaries for LLM consumption.
    """
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": SQL_SYSTEM_PROMPT}
    ]

    messages.extend(SQL_FEW_SHOT_EXAMPLES)

    user_content = (
        f"Question: {question}\n"
        f"Intent: {json.dumps(intent_dict)}\n"
        f"Schema:\n{schema_text}"
    )
    if context:
        user_content = f"Context: {context}\n{user_content}"

    messages.append({"role": "user", "content": user_content})
    return messages
