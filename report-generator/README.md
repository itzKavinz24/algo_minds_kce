# Enterprise Analytics Report Generator

Production-grade, decoupled **Report Generation Service** designed for Enterprise Analytics. It transforms structured `AnalysisResult` JSON payloads from Analytics Agents into publication-ready, multi-page executive PDF reports.

---

## 1. Architecture Overview

```
User / Business Stakeholder
            │
            ▼
     Analytics Agent
            │
            ▼
    AnalysisResult JSON
            │
            ▼  POST /generate-report
┌─────────────────────────────────────────────────────────────┐
│                 REPORT GENERATOR SERVICE                    │
│                                                             │
│  ├── 1. Validation Service (Pydantic v2 Contract)           │
│  ├── 2. Chart Service (Matplotlib Headless Agg Engine)      │
│  ├── 3. Formatting Utilities (Indian ₹ notation, numbers)   │
│  ├── 4. PDF Builder Service (ReportLab Multi-Page Flowables)│
│  │    ├── Custom NumberedCanvas ("Page X of Y")             │
│  │    ├── Running Headers & Confidential Footers            │
│  │    ├── 11 Discrete Executive Sections                    │
│  │    └── Repeating Table Headers Across Page Splits        │
│  └── 5. Storage & Download Manager                          │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
   Generated PDF Report  (generated_reports/{report_id}.pdf)
            │
            ▼  GET /reports/{report_id}/download
   Executive Stakeholder / Jury
```

---

## 2. Key Capabilities & Design Decisions

- **Decoupled Architecture**: Zero database connections, zero hardcoded domain assumptions, zero SQL generation. The service functions identically for **E-Commerce**, **HRMS**, **CRM**, or **ERP** datasets.
- **Indian Currency & Number Formatting**: Formats values like `2039938` into `₹20,39,938` using standard Indian numbering system (Lakhs and Crores).
- **Automated Visualization Selection**:
  - *Categorical + Numeric*: Bar chart (horizontal with labels or vertical with value callouts).
  - *Time-Series + Numeric*: Line chart with area gradient fill and peak annotations.
  - *Composition / Share*: Donut chart with percentages and side legends.
  - *Multi-Metric*: Grouped comparative bar chart.
- **11 Standard Enterprise Report Sections**:
  1. Header / Document Banner (Report ID, Generated Date, System)
  2. Section 1 — Prominent Business Question
  3. Section 2 — Executive Summary Callout (High-level business takeaway)
  4. Section 3 — Data Sources & Schema Card
  5. Section 4 — Analytical Methodology (7-step analytical process)
  6. Section 5 — SQL / Analytical Evidence (Auditable monospace block)
  7. Section 6 — Query Results (Alternating rows, repeating headers across pages)
  8. Section 7 — Visualizations (Embedded high-resolution chart)
  9. Section 8 — Key Findings (Numbered factual takeaways)
  10. Section 9 — Recommendations (Actionable advisory guidance)
  11. Section 10 — Data Quality & Limitations Audit
  12. Section 11 — Report Metadata Summary
- **Multi-Page Resiliency**: Built using ReportLab's `NumberedCanvas` computing total pages dynamically ("Page X of Y") with running headers and confidential footers on every page.

---

## 3. Input Contract (`AnalysisResult`)

### JSON Schema

```json
{
  "report_id": "RPT-20260909-001",
  "business_question": "Which product categories generated the highest revenue?",
  "data_source": {
    "id": "ecommerce_db",
    "engine": "PostgreSQL",
    "schema": "public",
    "name": "E-Commerce Production DB"
  },
  "tables_used": [
    "products",
    "order_items",
    "orders"
  ],
  "sql": "SELECT p.category, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id WHERE o.status = 'completed' GROUP BY p.category ORDER BY revenue DESC;",
  "query_result": {
    "columns": [
      {"name": "category", "data_type": "text"},
      {"name": "revenue", "data_type": "numeric"}
    ],
    "rows": [
      {"category": "Electronics", "revenue": 2039938},
      {"category": "Home & Kitchen", "revenue": 475275},
      {"category": "Sports", "revenue": 432477},
      {"category": "Fashion", "revenue": 350425},
      {"category": "Accessories", "revenue": 270432},
      {"category": "Groceries", "revenue": 176130},
      {"category": "Books", "revenue": 155856},
      {"category": "Beauty", "revenue": 145432}
    ],
    "row_count": 8
  },
  "analysis": {
    "summary": "Electronics generated the highest revenue among all product categories, contributing ₹20,39,938 (over 50% of total revenue).",
    "key_findings": [
      "Electronics generated the highest revenue at ₹20,39,938, significantly outperforming all other categories.",
      "Home & Kitchen ranked second with ₹4,75,275, followed closely by Sports at ₹4,32,477.",
      "The top 3 categories combined account for over 72% of total enterprise receipts."
    ],
    "recommendations": [
      "Investigate the key drivers and high-margin SKUs contributing to Electronics performance.",
      "Analyze monthly Electronics seasonal purchasing trends to optimize supply chain commitments.",
      "Evaluate promotional bundling strategies between Home & Kitchen and Sports."
    ],
    "data_quality_and_limitations": [
      "Analysis reflects completed order transactions; cancelled and refunded orders were excluded.",
      "All records from the current active enterprise fiscal window were fully processed."
    ]
  },
  "metadata": {
    "generated_at": "2026-09-09T12:00:00+05:30",
    "execution_time_ms": 18.4,
    "filters_applied": [
      "orders.status = 'completed'",
      "fiscal_period = 'FY2026'"
    ],
    "truncated": false,
    "total_source_rows": 8
  }
}
```

---

## 4. API Endpoints

### 1. `POST /generate-report`
Accepts `AnalysisResult` JSON (or wrapped in `{"analysis_result": {...}}`) and produces a PDF report.

**Request**: `Content-Type: application/json`
```json
{
  "analysis_result": { ... }
}
```

**Response** (`200 OK`):
```json
{
  "report_id": "RPT-20260909-001",
  "status": "completed",
  "file": "D:/My-Projects/Algominds/report-generator/generated_reports/RPT-20260909-001.pdf",
  "download_url": "http://localhost:8000/reports/RPT-20260909-001/download",
  "created_at": "2026-09-09T00:38:40.123456",
  "row_count": 8,
  "page_count": 3
}
```

### 2. `GET /reports/{report_id}`
Retrieves metadata and status of an existing report.

**Response** (`200 OK`):
```json
{
  "report_id": "RPT-20260909-001",
  "filename": "RPT-20260909-001.pdf",
  "size_bytes": 175024,
  "download_url": "http://localhost:8000/reports/RPT-20260909-001/download",
  "status": "ready"
}
```

### 3. `GET /reports/{report_id}/download`
Downloads the binary PDF file directly as an attachment.
- Header: `Content-Type: application/pdf`
- Header: `Content-Disposition: attachment; filename="RPT-20260909-001.pdf"`

### 4. `GET /health`
Returns service and PDF rendering health status.

---

## 5. Integration Guide for Analytics Agent

To generate a PDF report from any agent workflow in Python:

```python
import requests

def request_pdf_report(analysis_result_dict: dict, report_api_url: str = "http://localhost:8000") -> str:
    """Send structured AnalysisResult to Report Generator and return PDF download URL."""
    resp = requests.post(
        f"{report_api_url}/generate-report",
        json={"analysis_result": analysis_result_dict},
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    resp.raise_for_status()
    data = resp.json()
    return data["download_url"]
```

---

## 6. Running Standalone or Integrated

### Option A: Integrated (Already Active on Port 8000)
The router is mounted into `backend/main.py`. Any request to `http://localhost:8000/generate-report` is handled directly.

### Option B: Standalone Microservice (Independent Port)
```bash
cd report-generator
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

---

## 7. Automated Test Suite

Run the comprehensive 15-scenario test suite:
```bash
python -m unittest discover -s report-generator/tests -p "test_*.py" -v
```

All 15 test scenarios:
- `test_01_valid_analysis_result`: Valid contract parsing and identifier generation
- `test_02_invalid_analysis_result`: Strict validation error handling
- `test_03_empty_query_result`: Clean empty result message without crashes
- `test_04_single_row_result`: Single KPI / metric row handling
- `test_05_large_result_set_multipage`: 120+ rows spanning across multiple pages with repeating headers
- `test_06_numeric_and_currency_formatting`: Indian numbering system (`₹20,39,938`) and percentages
- `test_07_time_series_line_chart`: Time-series trend chart with gradient area fill
- `test_08_categorical_bar_chart`: Categorical bar chart with data labels
- `test_09_missing_recommendations`: Graceful fallback when recommendations are omitted
- `test_10_missing_metadata_defaults`: Auto-populated timestamps and execution records
- `test_11_pdf_generation_binary_integrity`: Valid `%PDF-1.4` binary header and EOF markers
- `test_12_chart_binary_integrity`: Valid `\x89PNG` image stream
- `test_13_multipage_pagination`: Multi-page numbering and layout
- `test_14_wide_tables_fit_margins`: Automatic column width calculation fitting 540pt printable canvas
- `test_15_end_to_end_api_generation`: Complete FastAPI HTTP lifecycle (`POST /generate-report` -> `GET /download`)
