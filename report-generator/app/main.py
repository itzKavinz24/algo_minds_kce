"""
FastAPI Application for Enterprise Analytics Report Generator.
Provides endpoints for synchronous/asynchronous PDF generation, metadata inspection,
and direct file downloads.
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.models.analysis_result import (
    AnalysisResult,
    GenerateReportRequest,
    GenerateReportResponse,
)
from app.services.report_service import ReportService

# Initialize ReportService
report_service = ReportService()

# Create router so it can be mounted in standalone app or parent backend
router = APIRouter(tags=["Reports"])


@router.get("/health")
def health_check() -> Dict[str, Any]:
    """Health check endpoint indicating report generator engine status."""
    return {
        "status": "healthy",
        "service": "Enterprise Analytics Report Generator",
        "version": "1.0.0",
        "pdf_engine": "ReportLab 5.0",
        "chart_engine": "Matplotlib Agg (Headless)",
        "output_directory": str(report_service.output_dir),
    }


@router.post("/generate-report", response_model=GenerateReportResponse)
@router.post("/api/generate-report", response_model=GenerateReportResponse)
async def generate_report(req: Request, request_data: Dict[str, Any] = Body(...)) -> GenerateReportResponse:
    """
    Generate an enterprise PDF report from structured AnalysisResult JSON.
    Accepts either {"analysis_result": {...}} wrapper or direct AnalysisResult payload.
    """
    # 1. Parse and validate input
    analysis_res: Optional[AnalysisResult] = None

    if isinstance(request_data, dict):
        if "analysis_result" in request_data and isinstance(request_data["analysis_result"], dict):
            try:
                analysis_res = AnalysisResult(**request_data["analysis_result"])
            except ValidationError as ve:
                raise HTTPException(status_code=422, detail=f"Invalid AnalysisResult contract: {ve.errors()}")
        elif "business_question" in request_data and "query_result" in request_data:
            try:
                analysis_res = AnalysisResult(**request_data)
            except ValidationError as ve:
                raise HTTPException(status_code=422, detail=f"Invalid AnalysisResult contract: {ve.errors()}")

    if not analysis_res:
        raise HTTPException(
            status_code=422,
            detail="Request body must contain a valid 'analysis_result' or 'AnalysisResult' payload with 'business_question', 'query_result', etc."
        )

    # 2. Determine base URL for download links
    base_url = str(req.base_url).rstrip("/")

    # 3. Generate report
    try:
        response_data, _ = report_service.generate(analysis_res, base_url=base_url)
        return response_data
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        print(f"[Report Generation Error] {e}")
        raise HTTPException(status_code=500, detail="Failed to synthesize PDF report due to internal processing error.")


@router.get("/reports/{report_id}")
def get_report_metadata(report_id: str, req: Request) -> Dict[str, Any]:
    """Retrieve metadata and download status for an existing report."""
    file_path = report_service.get_report_path(report_id)
    if not file_path:
        raise HTTPException(status_code=404, detail=f"Report with ID '{report_id}' was not found.")

    stat = file_path.stat()
    base_url = str(req.base_url).rstrip("/")
    download_url = f"{base_url}/reports/{report_id}/download"

    return {
        "report_id": report_id,
        "filename": file_path.name,
        "size_bytes": stat.st_size,
        "download_url": download_url,
        "status": "ready",
    }


@router.get("/reports/{report_id}/download")
def download_report(report_id: str):
    """Download the generated PDF file directly."""
    file_path = report_service.get_report_path(report_id)
    if not file_path:
        raise HTTPException(status_code=404, detail=f"Report file for ID '{report_id}' does not exist.")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=f"{report_id}.pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{report_id}.pdf\"",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.get("/reports")
def list_reports(req: Request) -> Dict[str, Any]:
    """List all reports stored in the system."""
    base_url = str(req.base_url).rstrip("/")
    reports = report_service.list_reports()
    for r in reports:
        r["download_url"] = f"{base_url}/reports/{r['report_id']}/download"
    return {
        "count": len(reports),
        "reports": reports,
    }


# Standalone FastAPI App
app = FastAPI(
    title="Enterprise Analytics Report Generator",
    version="1.0.0",
    description="Decoupled production-quality service generating executive PDF analytics reports."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
