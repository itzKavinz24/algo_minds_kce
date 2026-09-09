"""
Report Service orchestrating validation, chart generation, PDF synthesis,
file persistence, and retrieval.
"""

import os
import re
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

from app.models.analysis_result import (
    AnalysisResult,
    GenerateReportResponse,
)
from app.services.validation_service import ValidationService
from app.services.chart_service import ChartService
from app.services.pdf_service import PDFService


# Default generated reports directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPORTS_DIR = BASE_DIR / "generated_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _count_pdf_pages(pdf_bytes: bytes) -> int:
    """Extract approximate page count from PDF binary stream."""
    try:
        # Match standard /Type /Page objects in PDF
        matches = re.findall(rb"/Type\s*/Page\b", pdf_bytes)
        count = len(matches)
        return max(count, 1)
    except Exception:
        return 1


class ReportService:
    """End-to-end report generation and retrieval management."""

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or REPORTS_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, analysis_result: AnalysisResult, base_url: str = "") -> Tuple[GenerateReportResponse, bytes]:
        """
        Execute validation, chart generation, PDF creation, and file persistence.
        """
        # 1. Semantic validation
        is_valid, errors = ValidationService.validate(analysis_result)
        if not is_valid:
            error_msg = "; ".join(errors)
            raise ValueError(f"AnalysisResult validation failed: {error_msg}")

        # 2. Automated chart synthesis
        chart_png_bytes = None
        try:
            chart_png_bytes = ChartService.generate_chart(
                analysis_result.query_result,
                business_question=analysis_result.business_question,
            )
        except Exception as e:
            print(f"[Chart Generation Warning] {e}")

        # 3. PDF document synthesis
        pdf_bytes = PDFService.generate_pdf(analysis_result, chart_png_bytes=chart_png_bytes)

        # 4. Persistence
        report_id = analysis_result.report_id
        safe_filename = f"{report_id}.pdf"
        file_path = self.output_dir / safe_filename

        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        # 5. Metadata & Response
        page_count = _count_pdf_pages(pdf_bytes)
        download_url = f"{base_url.rstrip('/')}/reports/{report_id}/download" if base_url else f"/reports/{report_id}/download"

        response = GenerateReportResponse(
            report_id=report_id,
            status="completed",
            file=f"/reports/{report_id}.pdf",
            download_url=download_url,
            created_at=datetime.now().isoformat(),
            row_count=analysis_result.query_result.row_count,
            page_count=page_count,
        )

        return response, pdf_bytes

    def get_report_path(self, report_id: str) -> Optional[Path]:
        """Retrieve path to existing report PDF by report_id."""
        safe_filename = f"{report_id}.pdf"
        target = self.output_dir / safe_filename
        if target.exists() and target.is_file():
            return target
        return None

    def list_reports(self) -> List[Dict[str, Any]]:
        """List all generated report files and basic metadata."""
        reports = []
        for p in self.output_dir.glob("*.pdf"):
            try:
                stat = p.stat()
                reports.append({
                    "report_id": p.stem,
                    "filename": p.name,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                })
            except Exception:
                continue
        reports.sort(key=lambda x: x["created_at"], reverse=True)
        return reports
