"""
CLI script to generate demo reports from JSON fixtures.
Tests both Section 18 E-Commerce and non-E-Commerce HRMS reports.
"""

import sys
import json
from pathlib import Path

# Add report-generator root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from app.models.analysis_result import AnalysisResult
from app.services.report_service import ReportService


def run_demo():
    print("=" * 65)
    print("  Enterprise Analytics Report Generator -- Demo Generation")
    print("=" * 65)

    service = ReportService()

    # 1. E-Commerce Demo (Section 18)
    ecom_json_path = SCRIPT_DIR / "demo_ecommerce_report.json"
    with open(ecom_json_path, "r", encoding="utf-8-sig") as f:
        ecom_data = json.load(f)

    ecom_result = AnalysisResult(**ecom_data)
    print(f"\n[1/2] Generating E-Commerce Report: '{ecom_result.business_question}'")
    ecom_resp, ecom_bytes = service.generate(ecom_result)
    print(f"  [OK] Report ID:    {ecom_resp.report_id}")
    print(f"  [OK] Output File:  {ecom_resp.file}")
    print(f"  [OK] PDF Size:     {len(ecom_bytes):,} bytes")
    print(f"  [OK] Page Count:   {ecom_resp.page_count} page(s)")

    # 2. HRMS Demo (Section 13 / 17 Non-E-Commerce)
    hrms_json_path = SCRIPT_DIR / "demo_hrms_report.json"
    with open(hrms_json_path, "r", encoding="utf-8-sig") as f:
        hrms_data = json.load(f)

    hrms_result = AnalysisResult(**hrms_data)
    print(f"\n[2/2] Generating HRMS Report: '{hrms_result.business_question}'")
    hrms_resp, hrms_bytes = service.generate(hrms_result)
    print(f"  [OK] Report ID:    {hrms_resp.report_id}")
    print(f"  [OK] Output File:  {hrms_resp.file}")
    print(f"  [OK] PDF Size:     {len(hrms_bytes):,} bytes")
    print(f"  [OK] Page Count:   {hrms_resp.page_count} page(s)")

    print("\n" + "=" * 65)
    print("  All demo PDF reports generated successfully!")
    print("=" * 65)


if __name__ == "__main__":
    run_demo()
