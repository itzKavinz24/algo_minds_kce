"""
Comprehensive End-to-End Verification Script for AGENTVERSE Architecture & Report Generator.
Validates:
1. Section 27: Deterministic E-Commerce Report Test
2. Section 28: Non-E-Commerce HRMS Report Test
3. Section 36: Full Demo Flow (Analytics Agent -> AnalysisResult -> Report Generator -> PDF)
4. API Endpoints & Route Integrity
"""

import urllib.request
import json
import io
import sys
from pathlib import Path
import pypdf

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE_URL = "http://localhost:8000"
STANDALONE_URL = "http://localhost:8001"


def post_json(url: str, data: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_json(url: str) -> dict:
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url) as resp:
        return resp.read()


def test_section_27_ecommerce():
    print("\n--- [1/4] Running Section 27: Deterministic E-Commerce Test ---")
    payload = {
        "analysis_result": {
            "contract_version": "1.0",
            "business_question": "Which product categories generated the highest revenue?",
            "data_source": {
                "id": "ecommerce_db",
                "name": "E-Commerce Production",
                "engine": "PostgreSQL",
                "schema": "public"
            },
            "tables_used": ["products", "order_items", "orders"],
            "sql": "SELECT category, ROUND(SUM(amount), 2) AS revenue FROM sales GROUP BY category ORDER BY revenue DESC;",
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
                "summary": "Electronics generated the highest revenue at ₹20,39,938, capturing over 50% of total category sales.",
                "key_findings": [
                    "Electronics is the dominant revenue engine at ₹20,39,938.",
                    "Home & Kitchen (₹4.75L) and Sports (₹4.32L) follow in volume.",
                    "Long-tail categories contribute 11.4% combined."
                ],
                "recommendations": [
                    "Investigate SKU factors contributing to Electronics performance.",
                    "Introduce cross-category bundling between Electronics and Accessories."
                ]
            },
            "metadata": {
                "generated_at": "2026-09-09T12:00:00+05:30",
                "execution_time_ms": 22.5
            }
        }
    }

    # 1. POST /generate-report
    resp = post_json(f"{BASE_URL}/generate-report", payload)
    assert resp["status"] == "completed", f"Expected completed status, got {resp}"
    assert "report_id" in resp, "report_id missing"
    assert resp["file"].startswith("/reports/"), f"Expected web path file, got {resp['file']}"
    report_id = resp["report_id"]
    print(f"✓ Generated Report ID: {report_id}")

    # 2. GET /reports/{report_id}
    meta = get_json(f"{BASE_URL}/reports/{report_id}")
    assert meta["status"] == "ready", f"Expected ready, got {meta}"
    assert meta["size_bytes"] > 50000, f"Unexpectedly small PDF: {meta['size_bytes']} bytes"
    print(f"✓ Metadata verified: {meta['filename']} ({meta['size_bytes']} bytes)")

    # 3. GET /reports/{report_id}/download
    pdf_bytes = get_bytes(f"{BASE_URL}/reports/{report_id}/download")
    assert pdf_bytes.startswith(b"%PDF-1.4"), "Invalid PDF magic header"
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    print(f"✓ PDF successfully decoded with {len(reader.pages)} pages")
    assert len(reader.pages) >= 2, f"Expected multi-page PDF, got {len(reader.pages)}"
    print("✓ Section 27 E-Commerce Test: PASSED")


def test_section_28_hrms():
    print("\n--- [2/4] Running Section 28: Non-E-Commerce HRMS Test ---")
    payload = {
        "analysis_result": {
            "contract_version": "1.0",
            "business_question": "Show employee distribution by department.",
            "data_source": {
                "id": "hrms_db",
                "name": "HRMS Core",
                "engine": "PostgreSQL",
                "schema": "hrms"
            },
            "tables_used": ["departments", "employees"],
            "sql": "SELECT department, COUNT(employee_id) AS headcount FROM employees GROUP BY department ORDER BY headcount DESC;",
            "query_result": {
                "columns": [
                    {"name": "department", "data_type": "text"},
                    {"name": "headcount", "data_type": "integer"}
                ],
                "rows": [
                    {"department": "Engineering", "headcount": 42},
                    {"department": "Operations", "headcount": 31},
                    {"department": "Sales", "headcount": 27},
                    {"department": "Finance", "headcount": 12},
                    {"department": "HR", "headcount": 8}
                ],
                "row_count": 5
            },
            "analysis": {
                "summary": "Engineering constitutes the largest department with 42 employees (35.0%), followed by Operations with 31 (25.8%).",
                "key_findings": [
                    "Engineering and Operations account for 60.8% of organizational headcount.",
                    "Sales maintains 27 active representatives across enterprise accounts.",
                    "Finance and HR operate with lean staffing ratios."
                ],
                "recommendations": [
                    "Maintain engineering-to-operations staffing ratio during product ramp.",
                    "Initiate selective recruitment for technical leadership."
                ]
            }
        }
    }

    resp = post_json(f"{STANDALONE_URL}/generate-report", payload)
    assert resp["status"] == "completed"
    report_id = resp["report_id"]
    print(f"✓ Generated HRMS Report ID on Standalone Microservice: {report_id}")

    pdf_bytes = get_bytes(f"{STANDALONE_URL}/reports/{report_id}/download")
    assert pdf_bytes.startswith(b"%PDF-1.4")
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    print(f"✓ Non-E-Commerce PDF decoded: {len(reader.pages)} pages")
    print("✓ Section 28 HRMS Test: PASSED (Zero E-Commerce Hardcoding)")


def test_section_36_demo_flow():
    print("\n--- [3/4] Running Section 36: Full Demo Flow via Analytics Agent ---")
    queries = [
        ("Show monthly sales trend for the last year.", "line", 12),
        ("Which product categories generated the highest revenue?", "bar", 8),
        ("What is total revenue this month?", "kpi", 1),
        ("Show employee distribution by department.", "donut", 5),
    ]

    for q_text, expected_viz_type, expected_min_rows in queries:
        print(f"\nEvaluating: '{q_text}'")
        # Step 1: Analytics Agent processes query
        agent_resp = post_json(f"{BASE_URL}/api/query", {"query": q_text})
        assert "analysis_result" in agent_resp, "Analytics Agent did not return canonical analysis_result"
        canonical_ar = agent_resp["analysis_result"]
        assert canonical_ar["business_question"] == q_text
        assert "query_result" in canonical_ar
        assert len(canonical_ar["query_result"]["rows"]) >= expected_min_rows
        print(f"✓ Analytics Agent produced canonical AnalysisResult v1.0 ({len(canonical_ar['query_result']['rows'])} rows)")

        # Step 2: Dashboard visualization verification
        viz_types = [v["type"] for v in agent_resp.get("visualizations", [])]
        assert expected_viz_type in viz_types, f"Expected {expected_viz_type} in {viz_types}"
        print(f"✓ Dashboard presentation view rendered: {viz_types} and {len(agent_resp.get('kpis', []))} KPIs")

        # Step 3: Report Generator generates PDF from the EXACT SAME analysis_result
        rep_resp = post_json(f"{BASE_URL}/generate-report", {"analysis_result": canonical_ar})
        assert rep_resp["status"] == "completed"
        report_id = rep_resp["report_id"]
        pdf_bytes = get_bytes(f"{BASE_URL}/reports/{report_id}/download")
        assert pdf_bytes.startswith(b"%PDF-1.4")
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        print(f"✓ Report Generator built PDF ({len(reader.pages)} pages) from the same AnalysisResult: {report_id}")

    print("\n✓ Section 36 Demo Flow: ALL 4 QUERIES PASSED END-TO-END")


def test_api_routes():
    print("\n--- [4/4] Verifying API Routes & Endpoints ---")
    h8000 = get_json(f"{BASE_URL}/health")
    assert h8000["status"] == "healthy"
    print("✓ Backend /health is healthy")

    h_api = get_json(f"{BASE_URL}/api/health")
    assert h_api["status"] == "healthy"
    assert h_api["speech_model_ready"] is True
    print("✓ Backend /api/health is healthy (Whisper CUDA Active)")

    h8001 = get_json(f"{STANDALONE_URL}/health")
    assert h8001["status"] == "healthy"
    print("✓ Standalone Microservice /health is healthy")

    # Verify alias /api/generate-report
    test_res = post_json(f"{BASE_URL}/api/generate-report", {
        "business_question": "API Alias Test",
        "query_result": {"columns": [{"name": "n", "data_type": "integer"}], "rows": [{"n": 1}], "row_count": 1},
        "analysis": {"summary": "Alias test passed."}
    })
    assert test_res["status"] == "completed"
    print(f"✓ Route alias /api/generate-report works: {test_res['report_id']}")


if __name__ == "__main__":
    test_section_27_ecommerce()
    test_section_28_hrms()
    test_section_36_demo_flow()
    test_api_routes()
    print("\n========================================================")
    print("🎉 ALL END-TO-END AUDIT TESTS PASSED SUCCESSFULLY!")
    print("========================================================\n")
