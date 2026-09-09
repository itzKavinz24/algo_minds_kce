"""Deterministic read-only SQL validation executed outside the LLM layer."""

import re
from dataclasses import dataclass, field
from typing import List, Optional

from models.schemas import DatabaseSchema


FORBIDDEN_KEYWORDS = {
    "ALTER", "CALL", "COPY", "CREATE", "DELETE", "DROP", "EXEC", "EXECUTE",
    "GRANT", "INSERT", "MERGE", "REPLACE", "REVOKE", "TRUNCATE", "UPDATE",
}


@dataclass
class ValidationResult:
    safe: bool
    sql: str
    errors: List[str] = field(default_factory=list)

    def to_dict(self):
        return {"safe": self.safe, "sql": self.sql, "errors": self.errors}


class SQLValidator:
    """Reject unsafe statements and enforce a bounded result set."""

    def __init__(self, default_limit: int = 500) -> None:
        self.default_limit = default_limit

    def validate(
        self,
        sql: str,
        schema: Optional[DatabaseSchema] = None,
        declared_tables: Optional[List[str]] = None,
    ) -> ValidationResult:
        original = (sql or "").strip()
        errors: List[str] = []
        normalized = self._remove_comments_and_literals(original)
        upper = normalized.upper()

        if not original:
            errors.append("SQL is empty.")
        if not re.match(r"^\s*(SELECT|WITH)\b", upper):
            errors.append("Only SELECT or WITH queries are allowed.")
        if ";" in normalized.rstrip(";"):
            errors.append("Multiple SQL statements are not allowed.")

        found = sorted(k for k in FORBIDDEN_KEYWORDS if re.search(rf"\b{k}\b", upper))
        if found:
            errors.append("Forbidden SQL keyword(s): " + ", ".join(found))

        if schema is not None and declared_tables:
            known = {name.lower() for name in schema.tables}
            unknown = sorted({str(name).lower() for name in declared_tables} - known)
            if unknown:
                errors.append("Unknown table(s): " + ", ".join(unknown))

        safe_sql = original.rstrip().rstrip(";")
        if not errors and not re.search(r"\bLIMIT\s+\d+\b", upper):
            safe_sql = f"{safe_sql} LIMIT {self.default_limit}"
        return ValidationResult(not errors, safe_sql, errors)

    @staticmethod
    def _remove_comments_and_literals(sql: str) -> str:
        without_comments = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
        without_comments = re.sub(r"--[^\r\n]*", " ", without_comments)
        return re.sub(r"'(?:''|[^'])*'", "''", without_comments)
