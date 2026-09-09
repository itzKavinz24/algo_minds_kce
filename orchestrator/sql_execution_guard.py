"""Bounded SQL validation, MCP execution, result checks, and self-correction."""

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from models.schemas import DatabaseSchema, IntentOutput, SQLOutput

logger = logging.getLogger(__name__)


@dataclass
class SQLExecutionOutcome:
    sql_result: SQLOutput
    sql: str
    rows: List[Dict[str, Any]]
    retries: List[Dict[str, Any]] = field(default_factory=list)
    result_validation: Dict[str, Any] = field(default_factory=dict)


class SQLExecutionError(RuntimeError):
    def __init__(self, message: str, retries: Optional[List[Dict[str, Any]]] = None):
        super().__init__(message)
        self.retries = retries or []


class SQLExecutionGuard:
    """Execute SQL safely and allow no more than two metadata-assisted retries."""

    def __init__(self, max_retries: int = 2) -> None:
        self.max_retries = min(2, max(0, int(max_retries)))

    def execute(
        self,
        *,
        question: str,
        intent: IntentOutput,
        source: str,
        schema: DatabaseSchema,
        sql_result: SQLOutput,
        validator,
        mcp,
        sql_agent,
        context: Optional[str] = None,
    ) -> SQLExecutionOutcome:
        retries: List[Dict[str, Any]] = []
        current = sql_result
        sql, rows, problem = self._attempt(current, schema, source, validator, mcp)
        if problem is None and rows:
            return self._outcome(current, sql, rows, retries, "valid_non_empty")
        if problem is None and not self._empty_result_needs_review(sql):
            return self._outcome(current, sql, rows, retries, "valid_empty_unfiltered")

        reason = problem or "Query returned 0 rows with filters or joins that require metadata review."
        for retry_number in range(1, self.max_retries + 1):
            metadata = self._metadata_for_retry(mcp, source, schema, current)
            correction_context = self._correction_context(
                context, source, current.sql, reason, metadata, retry_number,
            )
            retry_entry = {
                "attempt": retry_number,
                "database": source,
                "originalSql": current.sql,
                "reason": self._sanitize(reason),
                "correctedSql": None,
                "executionResult": {"status": "correction_failed", "rowCount": 0},
            }
            try:
                corrected = sql_agent.generate_sql(
                    question, intent, schema, context=correction_context,
                )
                retry_entry["correctedSql"] = corrected.sql
                if corrected.sql.strip() == current.sql.strip():
                    retry_entry["executionResult"] = {
                        "status": "not_retried", "rowCount": len(rows),
                        "message": "Correction produced identical SQL.",
                    }
                    retries.append(retry_entry)
                    break
                corrected_sql, corrected_rows, corrected_problem = self._attempt(
                    corrected, schema, source, validator, mcp,
                )
                retry_entry["executionResult"] = {
                    "status": "success" if corrected_problem is None else "failed",
                    "rowCount": len(corrected_rows),
                    **({"message": self._sanitize(corrected_problem)} if corrected_problem else {}),
                }
                retries.append(retry_entry)
                current, sql, rows = corrected, corrected_sql, corrected_rows
                problem = corrected_problem
                if corrected_problem is None and corrected_rows:
                    self._log_retry(retry_entry)
                    return self._outcome(current, sql, rows, retries, "valid_after_retry")
                if corrected_problem is None and not self._empty_result_needs_review(sql):
                    self._log_retry(retry_entry)
                    return self._outcome(current, sql, rows, retries, "valid_empty_unfiltered")
                reason = corrected_problem or "Corrected query still returned 0 rows."
            except Exception as exc:
                retry_entry["executionResult"]["message"] = self._sanitize(str(exc))
                retries.append(retry_entry)
                reason = f"SQL correction failed: {self._sanitize(str(exc))}"
            self._log_retry(retry_entry)

        if problem is None:
            return self._outcome(current, sql, rows, retries, "empty_after_metadata_review")
        raise SQLExecutionError(self._sanitize(reason), retries)

    @staticmethod
    def _attempt(sql_result, schema, source, validator, mcp):
        validation = validator.validate(sql_result.sql, schema, sql_result.tables_used)
        if not validation.safe:
            return validation.sql, [], "SQL validation rejected the query: " + "; ".join(validation.errors)
        try:
            return validation.sql, mcp.execute_read_query(source, validation.sql), None
        except Exception as exc:
            return validation.sql, [], f"Database execution failed: {type(exc).__name__}: {exc}"

    @staticmethod
    def _empty_result_needs_review(sql: str) -> bool:
        return bool(re.search(r"\b(?:WHERE|JOIN|HAVING)\b", sql or "", re.IGNORECASE))

    def _metadata_for_retry(self, mcp, source, schema, sql_result) -> str:
        table_names = list(sql_result.tables_used) or self._tables_from_sql(sql_result.sql)
        details = []
        for table in table_names:
            if table not in schema.tables:
                continue
            try:
                details.append(self._remove_sensitive(mcp.describe_table(source, table)))
            except Exception:
                details.append(schema.tables[table].to_dict())
        try:
            relationships = self._remove_sensitive(mcp.get_relationships(source))
        except Exception:
            relationships = [item.to_dict() for item in schema.relationships]
        payload = json.dumps({"tables": details, "relationships": relationships}, default=str)
        return payload[:16000]

    @staticmethod
    def _correction_context(context, source, original_sql, reason, metadata, retry_number):
        prefix = f"{context}\n" if context else ""
        return prefix + (
            f"SQL self-correction attempt {retry_number} for source {source}.\n"
            f"Original SQL: {original_sql}\n"
            f"Observed problem: {reason}\n"
            f"Detailed metadata discovered from MCP: {metadata}\n"
            "Correct the SQL using only this metadata. Preserve the business meaning. "
            "For categorical filters use observed values exactly, and for joins use only "
            "declared relationships. Return one read-only query in the normal JSON format."
        )

    @staticmethod
    def _tables_from_sql(sql: str) -> List[str]:
        return [
            match.group(1).split(".")[-1].strip('"')
            for match in re.finditer(
                r"\b(?:FROM|JOIN)\s+([A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)?)",
                sql or "", re.IGNORECASE,
            )
        ]

    @classmethod
    def _remove_sensitive(cls, value):
        if isinstance(value, dict):
            return {
                key: cls._remove_sensitive(item)
                for key, item in value.items()
                if not re.search(r"password|secret|token|credential|connection|dsn|url", str(key), re.I)
            }
        if isinstance(value, list):
            return [cls._remove_sensitive(item) for item in value]
        return value

    @staticmethod
    def _sanitize(message: Any) -> str:
        text = str(message or "")[:1000]
        text = re.sub(r"(?i)(password|token|secret|credential)\s*[=:]\s*\S+", r"\1=[REDACTED]", text)
        text = re.sub(r"(?i)postgres(?:ql)?://\S+", "[REDACTED_CONNECTION]", text)
        return text

    @staticmethod
    def _outcome(sql_result, sql, rows, retries, status):
        return SQLExecutionOutcome(
            sql_result=sql_result, sql=sql, rows=rows, retries=retries,
            result_validation={
                "status": status,
                "valid": status.startswith("valid") or status == "empty_after_metadata_review",
                "rowCount": len(rows),
                "retryCount": len(retries),
            },
        )

    @staticmethod
    def _log_retry(entry):
        logger.warning("SQL self-correction: %s", json.dumps(entry, default=str))

