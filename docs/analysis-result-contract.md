# AnalysisResult Canonical Data Contract (v1.0)

## 1. Overview & Purpose

The `AnalysisResult` JSON contract is the single authoritative data interface between the **Analytics Agent** and downstream consumers in AGENTVERSE:
1. The **Experience Layer** (Interactive React Dashboard)
2. The **Report Generator Service** (Publication-grade executive PDF reports)

This contract decouples analytical reasoning from presentation. It guarantees that the dashboard and the generated PDF report are derived from the exact same underlying numbers, SQL query, and synthesized findings.

---

## 2. Ownership & Separation of Responsibilities

| Component | Responsibility | NOT Responsible For |
| :--- | :--- | :--- |
| **Analytics Agent** | Understands business questions, determines query intent, generates AST-validated SQL, requests data via MCP, calculates KPIs, synthesizes insights, produces canonical `AnalysisResult`. | PDF layout, document styling, chart image rendering, report distribution. |
| **Enterprise Data MCP Server** | Schema discovery, connection pooling, database query execution against PostgreSQL / MySQL. | Business reasoning, SQL generation, report formatting. |
| **Report Generator Service** | Consumes `AnalysisResult`, validates schema, generates charts strictly from `query_result`, formats executive sections, builds multi-page PDF with ReportLab. | Database connections, executing SQL, altering business takeaways, generating SQL. |

---

## 3. Schema Fields

### Required Fields
- **`business_question`** (`string`, min length 2): The original business question or analytical prompt.
- **`query_result`** (`object`): Structured tabular data returned from database execution.
  - `columns` (`array` of `{ name: string, data_type?: string }`): Column definitions.
  - `rows` (`array` of objects): The row records.
  - `row_count` (`integer`, `>= 0`): Number of rows returned.
- **`analysis`** (`object`): Synthesized analytical findings.
  - `summary` (`string`, min length 1): Executive high-level takeaway.
  - `key_findings` (`array` of `string`): Factual findings directly supported by data.
  - `recommendations` (`array` of `string`): Actionable business next steps.
  - `data_quality_and_limitations` (`array` of `string`, optional): Data caveats or sampling notes.

### Optional Fields
- **`contract_version`** (`string`): Schema version (default `"1.0"`).
- **`report_id`** (`string`): Unique report identifier (e.g. `RPT-20260909-001`). Auto-generated if omitted.
- **`data_source`** (`object`, optional): Information on data source (`id`, `name`, `engine`, `schema`).
- **`tables_used`** (`array` of `string`, optional): Database tables queried.
- **`sql`** (`string`, optional): The exact auditable SQL query executed.
- **`metadata`** (`object`, optional): Execution timestamp, query latency (`execution_time_ms`), truncation flags, filters applied.

---

## 4. Canonical JSON Example

```json
{
  "contract_version": "1.0",
  "report_id": "RPT-20260909-001",
  "business_question": "Which product categories generated the highest revenue?",
  "data_source": {
    "id": "ecommerce_db",
    "name": "E-Commerce",
    "engine": "PostgreSQL",
    "schema": "public"
  },
  "tables_used": [
    "products",
    "order_items",
    "orders"
  ],
  "sql": "SELECT category, ROUND(SUM(amount), 2) AS revenue FROM sales GROUP BY category ORDER BY revenue DESC;",
  "query_result": {
    "columns": [
      {
        "name": "category",
        "data_type": "text"
      },
      {
        "name": "revenue",
        "data_type": "numeric"
      }
    ],
    "rows": [
      {
        "category": "Electronics",
        "revenue": 2039938
      },
      {
        "category": "Home & Kitchen",
        "revenue": 475275
      },
      {
        "category": "Sports",
        "revenue": 432477
      },
      {
        "category": "Fashion",
        "revenue": 350425
      }
    ],
    "row_count": 4
  },
  "analysis": {
    "summary": "Electronics generated the highest revenue at ₹20,39,938.",
    "key_findings": [
      "Electronics is the leading revenue driver, outpacing the next category by over 4x.",
      "Home & Kitchen and Sports show steady contributions above ₹4,00,000 each."
    ],
    "recommendations": [
      "Protect Electronics margins through prioritized supplier terms.",
      "Evaluate cross-promotions between Sports and Apparel."
    ],
    "data_quality_and_limitations": [
      "Completed transactions analyzed with 100% data completeness."
    ]
  },
  "metadata": {
    "generated_at": "2026-09-09T12:00:00+05:30",
    "execution_time_ms": 24.8,
    "truncated": false
  }
}
```

---

## 5. Validation Rules

1. **Rejection Criteria**:
   - Missing or empty `business_question`.
   - Missing or `null` `query_result`.
   - Missing or empty `analysis.summary`.
   - `rows` not matching list of dicts.
   - Malformed JSON structure.
2. **Permitted Edge Cases**:
   - `row_count = 0` (empty query result is valid; report renders empty state notice).
   - Omission of `sql`, `data_source`, `tables_used`, or `metadata` (graceful fallbacks applied).
   - Dynamic column inference when `columns` array is empty but rows exist.

---

## 6. Versioning Strategy

- The contract includes `"contract_version": "1.0"`.
- Any non-breaking additions (e.g. new optional metadata keys) retain minor compatibility.
- Any breaking structural change requires incrementing to `"2.0"` with migration adapters.
