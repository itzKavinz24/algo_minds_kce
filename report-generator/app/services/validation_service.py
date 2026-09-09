"""
Validation Service for AnalysisResult payloads.
Enforces the canonical contract rules (Section 5):
Required: business_question, query_result, analysis
Optional: report_id, data_source, tables_used, sql, metadata
"""

from typing import List, Tuple, Any
from app.models.analysis_result import AnalysisResult


class ValidationService:
    """Validates structural and semantic requirements of AnalysisResult."""

    @staticmethod
    def validate(result: AnalysisResult) -> Tuple[bool, List[str]]:
        """
        Validate AnalysisResult against enterprise reporting standards.
        Returns (is_valid, list_of_errors).
        """
        errors = []

        # 1. Business Question (Required)
        if not result.business_question or len(result.business_question.strip()) < 2:
            errors.append("Business question must be at least 2 characters long.")

        # 2. Query Result (Required)
        if result.query_result is None:
            errors.append("Query result object is required.")
        else:
            if not isinstance(result.query_result.rows, list):
                errors.append("Query result rows must be a list.")
            if not isinstance(result.query_result.columns, list):
                errors.append("Query result columns must be a list.")

        # 3. Analysis (Required)
        if not result.analysis or not result.analysis.summary or len(result.analysis.summary.strip()) < 1:
            errors.append("Executive summary is required in the analysis section.")

        # Optional fields: sql, data_source, tables_used, metadata are NOT rejected if empty.
        return len(errors) == 0, errors
