"""Build response evidence exclusively from completed pipeline execution artifacts."""

import re
from typing import Any, Dict, Iterable, List, Optional


def _unique(values: Iterable[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        cleaned = str(value or "").strip()
        marker = cleaned.lower()
        if cleaned and marker not in seen:
            seen.add(marker)
            result.append(cleaned)
    return result


def _tables_from_sql(sql: str) -> List[str]:
    return _unique(
        match.group(1).split(".")[-1].strip('"')
        for match in re.finditer(
            r"\b(?:FROM|JOIN)\s+([A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)?)",
            sql or "",
            flags=re.IGNORECASE,
        )
    )


def _columns_from_sql(sql: str) -> List[str]:
    """Extract identifiers present in executed SQL while excluding SQL vocabulary."""
    text = re.sub(r"'(?:''|[^'])*'", " ", sql or "")
    tokens = re.findall(r"\b[A-Za-z_][\w$]*\b", text)
    reserved = {
        "select", "from", "join", "left", "right", "inner", "outer", "full", "cross",
        "on", "where", "and", "or", "not", "null", "is", "in", "between", "like",
        "group", "by", "having", "order", "asc", "desc", "limit", "offset", "as",
        "with", "distinct", "case", "when", "then", "else", "end", "interval",
        "true", "false", "nulls", "first", "last",
    }
    functions = {
        match.group(1).lower()
        for match in re.finditer(r"\b([A-Za-z_][\w$]*)\s*\(", text)
    }
    aliases = {
        match.group(1).lower()
        for match in re.finditer(r"\bAS\s+([A-Za-z_][\w$]*)", text, flags=re.IGNORECASE)
    }
    tables = {name.lower() for name in _tables_from_sql(text)}
    table_aliases = {
        match.group(2).lower()
        for match in re.finditer(
            r"\b(?:FROM|JOIN)\s+([A-Za-z_][\w$.]*)(?:\s+(?:AS\s+)?([A-Za-z_][\w$]*))?",
            text,
            flags=re.IGNORECASE,
        )
        if match.group(2) and match.group(2).lower() not in reserved
    }
    excluded = reserved | functions | aliases | tables | table_aliases
    return _unique(token for token in tokens if token.lower() not in excluded)


def _filters_from_sql(sql: str) -> List[str]:
    filters = []
    for keyword in ("WHERE", "HAVING"):
        match = re.search(
            rf"\b{keyword}\b\s+(.+?)(?=\bGROUP\s+BY\b|\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|$)",
            sql or "",
            flags=re.IGNORECASE | re.DOTALL,
        )
        if match:
            filters.append(f"{keyword} " + " ".join(match.group(1).split()))
    return filters


def _calculations_from_sql(sql: str) -> List[str]:
    calculations = [
        " ".join(match.group(0).split())
        for match in re.finditer(
            r"\b(?:COUNT|SUM|AVG|MIN|MAX|ROUND)\s*\([^()]*\)",
            sql or "",
            flags=re.IGNORECASE,
        )
    ]
    group = re.search(
        r"\bGROUP\s+BY\b\s+(.+?)(?=\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|$)",
        sql or "",
        flags=re.IGNORECASE | re.DOTALL,
    )
    if group:
        calculations.append("GROUP BY " + " ".join(group.group(1).split()))
    return _unique(calculations)


def build_analysis_evidence(
    response: Dict[str, Any],
    query_details: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Create evidence from a successful response and its executed query metadata."""
    sources = response.get("sources") or ([response.get("source")] if response.get("source") else [])
    details = query_details or response.get("queries") or []
    if not details and response.get("sql"):
        details = [{"source": sources[0] if sources else None, "sql": response["sql"]}]

    executed = []
    tables = []
    columns = []
    filters = []
    calculations = []
    for detail in details:
        sql = str(detail.get("sql") or "").strip()
        if not sql:
            continue
        executed.append({"database": detail.get("source"), "sql": sql})
        tables.extend(detail.get("tablesUsed") or _tables_from_sql(sql))
        columns.extend(detail.get("columnsUsed") or _columns_from_sql(sql))
        filters.extend(_filters_from_sql(sql))
        calculations.extend(_calculations_from_sql(sql))

    rows = response.get("data") if isinstance(response.get("data"), list) else []
    source_counts = response.get("sourceResults") or [
        {"source": sources[0] if sources else None, "rowCount": len(rows)}
    ]
    return {
        "databasesAccessed": _unique(sources),
        "tablesAccessed": _unique(tables),
        "columnsUsed": _unique(columns),
        "sqlExecuted": executed,
        "recordsReturned": len(rows),
        "recordsAnalyzed": len(rows),
        "recordsByDatabase": source_counts,
        "importantFilters": _unique(filters),
        "keyCalculations": _unique(calculations),
    }

