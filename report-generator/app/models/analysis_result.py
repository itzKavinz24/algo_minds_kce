"""
Pydantic v2 Models for Enterprise Analytics Report Generator.
Defines the canonical input contract (AnalysisResult v1.0) and API request/response models.
"""

from datetime import datetime
import uuid
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, field_validator, model_validator


class DataSourceInfo(BaseModel):
    """Information about the database or source system queried."""
    id: Optional[str] = Field(default="enterprise_db", description="Identifier of data source, e.g. ecommerce_db")
    engine: Optional[str] = Field(default="PostgreSQL", description="Database engine, e.g. PostgreSQL, MySQL, Snowflake")
    schema_name: Optional[str] = Field(default="public", alias="schema", description="Database schema")
    name: Optional[str] = Field(default=None, description="Human-friendly display name")

    model_config = {
        "populate_by_name": True
    }


class ColumnSpec(BaseModel):
    """Specification for a query result column."""
    name: str = Field(..., min_length=1, description="Column name")
    data_type: Optional[str] = Field(default="text", description="Data type, e.g. text, numeric, integer, timestamp")


class QueryResult(BaseModel):
    """Tabular data returned from the enterprise database query."""
    columns: List[ColumnSpec] = Field(default_factory=list, description="List of column specifications")
    rows: List[Dict[str, Any]] = Field(default_factory=list, description="List of row dictionaries")
    row_count: int = Field(default=0, ge=0, description="Total number of rows in result")

    @model_validator(mode="after")
    def sync_row_count_and_columns(self) -> "QueryResult":
        if not self.row_count and self.rows:
            self.row_count = len(self.rows)
        # If columns empty but rows exist, infer columns dynamically
        if not self.columns and self.rows:
            inferred = []
            sample_row = self.rows[0]
            for col_name, val in sample_row.items():
                dtype = "numeric" if isinstance(val, (int, float)) and not isinstance(val, bool) else "text"
                inferred.append(ColumnSpec(name=col_name, data_type=dtype))
            self.columns = inferred
        return self


class AnalysisContent(BaseModel):
    """Analytical findings, executive summary, and recommendations."""
    summary: str = Field(..., min_length=1, description="High-level executive takeaway in plain English")
    key_findings: List[str] = Field(default_factory=list, description="Factual findings directly supported by data")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations based on analysis")
    data_quality_and_limitations: Optional[List[str]] = Field(default=None, description="Known limitations or caveats")


class ReportMetadata(BaseModel):
    """Execution and generation metadata for audit trail."""
    generated_at: Optional[str] = Field(default=None, description="ISO timestamp of report creation")
    execution_time_ms: Optional[float] = Field(default=None, description="Query execution duration in milliseconds")
    filters_applied: Optional[List[str]] = Field(default=None, description="Business filters applied to query")
    truncated: Optional[bool] = Field(default=False, description="Whether result set was truncated")
    total_source_rows: Optional[int] = Field(default=None, description="Total rows in source table if sampled")


class AnalysisResult(BaseModel):
    """
    Canonical structured output contract from the Analytics Agent.
    Serves as the single source of truth for dashboard and PDF report generation.
    """
    contract_version: Optional[str] = Field(default="1.0", description="Contract schema version")
    report_id: Optional[str] = Field(default=None, description="Unique report identifier, e.g. RPT-20260909-001")
    business_question: str = Field(..., min_length=2, description="Original business question asked")
    data_source: Optional[DataSourceInfo] = Field(default=None, description="Data source details")
    tables_used: Optional[List[str]] = Field(default_factory=list, description="Database tables queried")
    sql: Optional[str] = Field(default=None, description="Auditable SQL query executed")
    query_result: QueryResult = Field(..., description="Query result data")
    analysis: AnalysisContent = Field(..., description="Synthesized analytical insights")
    metadata: Optional[ReportMetadata] = Field(default_factory=ReportMetadata, description="Audit and execution metadata")

    model_config = {
        "populate_by_name": True
    }

    @model_validator(mode="after")
    def ensure_identifiers(self) -> "AnalysisResult":
        if not self.report_id:
            now_str = datetime.now().strftime("%Y%m%d")
            rand_suffix = uuid.uuid4().hex[:6].upper()
            self.report_id = f"RPT-{now_str}-{rand_suffix}"
        if not self.metadata:
            self.metadata = ReportMetadata(generated_at=datetime.now().isoformat())
        elif not self.metadata.generated_at:
            self.metadata.generated_at = datetime.now().isoformat()
        if not self.data_source:
            self.data_source = DataSourceInfo(id="enterprise_db", engine="PostgreSQL", name="Enterprise Database")
        return self


class GenerateReportRequest(BaseModel):
    """Wrapper request model accommodating either nested analysis_result or direct fields."""
    analysis_result: Optional[AnalysisResult] = None

    @model_validator(mode="before")
    @classmethod
    def handle_root_or_nested(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "analysis_result" in data and isinstance(data["analysis_result"], dict):
                return data
            # Check if root dictionary looks like AnalysisResult
            if "business_question" in data and "query_result" in data:
                return {"analysis_result": data}
        return data


class GenerateReportResponse(BaseModel):
    """Response returned upon successful PDF generation."""
    report_id: str
    status: str = "completed"
    file: str
    download_url: Optional[str] = None
    created_at: Optional[str] = None
    row_count: Optional[int] = 0
    page_count: Optional[int] = None
