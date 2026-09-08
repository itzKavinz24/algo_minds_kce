"""Data schemas and models for the Agent Layer."""

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Union
import json


@dataclass
class FilterCondition:
    """Represents a filter condition extracted from user query."""
    field: str
    operator: str  # e.g., "=", "!=", ">", "<", ">=", "<=", "IN", "LIKE", "BETWEEN"
    value: Union[str, int, float, list, None]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FilterCondition":
        return cls(
            field=str(data.get("field", "")),
            operator=str(data.get("operator", "=")),
            value=data.get("value"),
        )


@dataclass
class IntentOutput:
    """Structured intent representation extracted from natural language question.

    Designed for direct consumption by downstream agents (SQL Agent, Analytics Agent,
    and Root-Cause Analysis Agent).
    """
    domain: str = "general"                     # e.g. "sales", "ecommerce", "hr", "finance", "inventory"
    analysis: str = "aggregate"                 # e.g. "trend", "breakdown", "aggregate", "distribution", "root_cause", "comparison"
    metric: Optional[str] = None                # e.g. "sales", "revenue", "headcount", "profit", "order_count"
    time_period: Optional[str] = None           # e.g. "last_year", "this_month", "last_month", "ytd", "q1"
    grouping: Optional[Union[str, List[str]]] = None  # e.g. "month", "category", "department", ["region", "month"]
    filters: List[FilterCondition] = field(default_factory=list)
    is_root_cause_query: bool = False           # Flag for queries asking "why", causal diagnosis
    raw_query: Optional[str] = None             # Original user question
    confidence: Optional[float] = 1.0           # Extraction confidence (0.0 to 1.0)

    def to_dict(self) -> Dict[str, Any]:
        """Convert the intent output to a clean dictionary."""
        return {
            "domain": self.domain,
            "analysis": self.analysis,
            "metric": self.metric,
            "time_period": self.time_period,
            "grouping": self.grouping,
            "filters": [f.to_dict() if isinstance(f, FilterCondition) else f for f in self.filters],
            "is_root_cause_query": self.is_root_cause_query,
            "raw_query": self.raw_query,
            "confidence": self.confidence,
        }

    def to_json(self, indent: int = 2) -> str:
        """Serialize the intent output to JSON string."""
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict[str, Any], raw_query: Optional[str] = None) -> "IntentOutput":
        """Validate and construct an IntentOutput instance from a dictionary."""
        # Normalize domain
        domain = str(data.get("domain", "general")).strip().lower()

        # Normalize analysis type
        analysis = str(data.get("analysis", "aggregate")).strip().lower()

        # Normalize metric
        raw_metric = data.get("metric")
        metric = str(raw_metric).strip().lower() if raw_metric else None

        # Normalize time_period
        raw_time = data.get("time_period")
        time_period = str(raw_time).strip().lower() if raw_time else None

        # Normalize grouping
        grouping = data.get("grouping")
        if isinstance(grouping, str):
            grouping = grouping.strip().lower()
        elif isinstance(grouping, list):
            grouping = [str(g).strip().lower() for g in grouping if g]
            if len(grouping) == 1:
                grouping = grouping[0]
            elif len(grouping) == 0:
                grouping = None

        # Parse filters
        raw_filters = data.get("filters", [])
        parsed_filters: List[FilterCondition] = []
        if isinstance(raw_filters, list):
            for f in raw_filters:
                if isinstance(f, dict) and "field" in f:
                    parsed_filters.append(FilterCondition.from_dict(f))
                elif isinstance(f, FilterCondition):
                    parsed_filters.append(f)

        # Root cause flag
        is_rca = bool(data.get("is_root_cause_query", False) or analysis in ("root_cause", "diagnostic", "causal"))

        # Confidence
        confidence = float(data.get("confidence", 1.0)) if data.get("confidence") is not None else 1.0

        return cls(
            domain=domain,
            analysis=analysis,
            metric=metric,
            time_period=time_period,
            grouping=grouping,
            filters=parsed_filters,
            is_root_cause_query=is_rca,
            raw_query=raw_query or data.get("raw_query"),
            confidence=confidence,
        )


@dataclass
class Relationship:
    """Represents a foreign-key or semantic join relationship between two tables."""
    from_table: str
    from_column: str
    to_table: str
    to_column: str
    relationship_type: str = "foreign_key"  # e.g., "foreign_key", "one_to_many", "many_to_one"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Relationship":
        return cls(
            from_table=data.get("from_table", ""),
            from_column=data.get("from_column", ""),
            to_table=data.get("to_table", ""),
            to_column=data.get("to_column", ""),
            relationship_type=data.get("relationship_type", "foreign_key"),
        )


@dataclass
class TableMetadata:
    """Represents metadata for a database table."""
    name: str
    columns: List[str]
    description: Optional[str] = None
    primary_key: Optional[Union[str, List[str]]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, name: str, data: Union[Dict[str, Any], List[str]]) -> "TableMetadata":
        if isinstance(data, list):
            return cls(name=name, columns=data)
        return cls(
            name=name,
            columns=data.get("columns", []),
            description=data.get("description"),
            primary_key=data.get("primary_key"),
        )


@dataclass
class DatabaseSchema:
    """Schema metadata container passed to the SQL Agent."""
    tables: Dict[str, TableMetadata] = field(default_factory=dict)
    relationships: List[Relationship] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tables": {k: v.to_dict() for k, v in self.tables.items()},
            "relationships": [r.to_dict() for r in self.relationships],
        }

    def format_for_prompt(self) -> str:
        """Format the schema description cleanly for LLM consumption."""
        lines = ["Available Database Tables & Columns:"]
        for table_name, meta in self.tables.items():
            col_list = ", ".join(meta.columns)
            desc = f" ({meta.description})" if meta.description else ""
            lines.append(f"- Table '{table_name}'{desc}: columns = [{col_list}]")

        if self.relationships:
            lines.append("\nTable Relationships (Foreign Keys / Joins):")
            for rel in self.relationships:
                lines.append(f"- {rel.from_table}.{rel.from_column} = {rel.to_table}.{rel.to_column}")

        return "\n".join(lines)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DatabaseSchema":
        tables: Dict[str, TableMetadata] = {}
        raw_tables = data.get("tables", {})
        for name, meta in raw_tables.items():
            tables[name] = TableMetadata.from_dict(name, meta)

        relationships: List[Relationship] = []
        raw_rels = data.get("relationships", [])
        for r in raw_rels:
            if isinstance(r, dict):
                relationships.append(Relationship.from_dict(r))
            elif isinstance(r, Relationship):
                relationships.append(r)

        return cls(tables=tables, relationships=relationships)


@dataclass
class SQLOutput:
    """Machine-readable output generated by the SQL Agent."""
    sql: str
    tables_used: List[str] = field(default_factory=list)
    columns_used: List[str] = field(default_factory=list)
    explanation: str = ""
    is_read_only: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SQLOutput":
        raw_sql = str(data.get("sql", "")).strip()
        # Clean potential markdown wrapping in sql field itself
        if raw_sql.startswith("```sql"):
            raw_sql = raw_sql[6:]
        if raw_sql.startswith("```"):
            raw_sql = raw_sql[3:]
        if raw_sql.endswith("```"):
            raw_sql = raw_sql[:-3]
        raw_sql = raw_sql.strip()

        tables = data.get("tables_used", [])
        if not isinstance(tables, list):
            tables = [str(tables)] if tables else []

        columns = data.get("columns_used", [])
        if not isinstance(columns, list):
            columns = [str(columns)] if columns else []

        return cls(
            sql=raw_sql,
            tables_used=tables,
            columns_used=columns,
            explanation=str(data.get("explanation", "")),
            is_read_only=bool(data.get("is_read_only", True)),
        )


@dataclass
class AnalyticsOutput:
    """Structured analytical insights generated by the Analytics Agent."""
    summary: str
    key_insights: List[str] = field(default_factory=list)
    computed_metrics: Dict[str, Any] = field(default_factory=dict)
    trend_direction: Optional[str] = None  # "increasing", "decreasing", "stable", "fluctuating", None
    anomalies: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    suggested_chart_type: Optional[str] = None  # e.g. "line_chart", "bar_chart", "donut_chart", "metric_card", "table"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AnalyticsOutput":
        insights = data.get("key_insights") or data.get("insights") or []
        if isinstance(insights, str):
            insights = [insights]

        anomalies = data.get("anomalies") or []
        if isinstance(anomalies, str):
            anomalies = [anomalies]

        recommendations = data.get("recommendations") or []
        if isinstance(recommendations, str):
            recommendations = [recommendations]

        return cls(
            summary=str(data.get("summary", "")).strip(),
            key_insights=[str(i) for i in insights],
            computed_metrics=data.get("computed_metrics") or {},
            trend_direction=data.get("trend_direction"),
            anomalies=[str(a) for a in anomalies],
            recommendations=[str(r) for r in recommendations],
            suggested_chart_type=data.get("suggested_chart_type"),
        )


@dataclass
class BaselineComparison:
    """Baseline performance metrics establishing that a change/decline occurred."""
    current_period: str
    previous_period: str
    current_value: float
    previous_value: float
    change_amount: float
    change_percent: float
    metric_name: str = "sales"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BaselineComparison":
        return cls(
            current_period=str(data.get("current_period", "current")),
            previous_period=str(data.get("previous_period", "previous")),
            current_value=float(data.get("current_value", 0.0)),
            previous_value=float(data.get("previous_value", 0.0)),
            change_amount=float(data.get("change_amount", 0.0)),
            change_percent=float(data.get("change_percent", 0.0)),
            metric_name=str(data.get("metric_name", "sales")),
        )


@dataclass
class EvidenceQuery:
    """Targeted analytical query request required to evaluate a hypothesis."""
    hypothesis_id: str
    question: str
    purpose: str
    target_metric: Optional[str] = None
    target_dimension: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EvidenceQuery":
        return cls(
            hypothesis_id=str(data.get("hypothesis_id", "")),
            question=str(data.get("question", "")),
            purpose=str(data.get("purpose", "")),
            target_metric=data.get("target_metric"),
            target_dimension=data.get("target_dimension"),
        )


@dataclass
class RootCauseHypothesis:
    """A plausible hypothesis explaining the performance anomaly."""
    id: str
    description: str
    dimension: Optional[str] = None
    confidence: Optional[str] = None  # "strongly_supported", "supported", "weakly_supported", "unsupported", "insufficient_evidence"
    evidence_queries: List[EvidenceQuery] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "description": self.description,
            "dimension": self.dimension,
            "confidence": self.confidence,
            "evidence_queries": [q.to_dict() for q in self.evidence_queries],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RootCauseHypothesis":
        queries = []
        for q in data.get("evidence_queries", []):
            if isinstance(q, dict):
                queries.append(EvidenceQuery.from_dict(q))
            elif isinstance(q, EvidenceQuery):
                queries.append(q)
        return cls(
            id=str(data.get("id", "")),
            description=str(data.get("description", "")),
            dimension=data.get("dimension"),
            confidence=data.get("confidence"),
            evidence_queries=queries,
        )


@dataclass
class EvidenceResult:
    """Analyzed evidence for a specific hypothesis."""
    hypothesis_id: str
    finding: str
    support: str  # "strongly_supported" | "supported" | "weakly_supported" | "unsupported" | "insufficient_evidence"
    contribution_percent: Optional[float] = None
    data_summary: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EvidenceResult":
        return cls(
            hypothesis_id=str(data.get("hypothesis_id", "")),
            finding=str(data.get("finding", "")),
            support=str(data.get("support", "insufficient_evidence")),
            contribution_percent=float(data["contribution_percent"]) if data.get("contribution_percent") is not None else None,
            data_summary=data.get("data_summary") or {},
        )


@dataclass
class RootCauseOutput:
    """Final diagnostic report produced by the Root-Cause Analysis Agent."""
    question: str
    baseline: BaselineComparison
    hypotheses: List[RootCauseHypothesis] = field(default_factory=list)
    evidence: List[EvidenceResult] = field(default_factory=list)
    primary_contributor: str = ""
    findings_summary: str = ""
    confidence: str = "medium"  # "high", "medium", "low", "inconclusive"
    recommendations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "question": self.question,
            "baseline": self.baseline.to_dict(),
            "hypotheses": [h.to_dict() for h in self.hypotheses],
            "evidence": [e.to_dict() for e in self.evidence],
            "primary_contributor": self.primary_contributor,
            "findings_summary": self.findings_summary,
            "confidence": self.confidence,
            "recommendations": self.recommendations,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RootCauseOutput":
        baseline_data = data.get("baseline", {})
        baseline = (
            BaselineComparison.from_dict(baseline_data)
            if isinstance(baseline_data, dict)
            else baseline_data
        )

        hypotheses = [
            RootCauseHypothesis.from_dict(h) if isinstance(h, dict) else h
            for h in data.get("hypotheses", [])
        ]
        evidence = [
            EvidenceResult.from_dict(e) if isinstance(e, dict) else e
            for e in data.get("evidence", [])
        ]

        recs = data.get("recommendations", [])
        if isinstance(recs, str):
            recs = [recs]

        return cls(
            question=str(data.get("question", "")),
            baseline=baseline,
            hypotheses=hypotheses,
            evidence=evidence,
            primary_contributor=str(data.get("primary_contributor", "")),
            findings_summary=str(data.get("findings_summary", "")),
            confidence=str(data.get("confidence", "medium")),
            recommendations=[str(r) for r in recs],
        )


@dataclass
class PipelineResult:
    """Unified integration response returned by the AgentPipeline."""
    query: str
    intent: Dict[str, Any]
    sql: Dict[str, Any]
    analytics: Dict[str, Any]
    root_cause: Optional[Dict[str, Any]] = None
    trace: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "intent": self.intent,
            "sql": self.sql,
            "analytics": self.analytics,
            "root_cause": self.root_cause,
            "trace": self.trace,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PipelineResult":
        return cls(
            query=str(data.get("query", "")),
            intent=data.get("intent") or {},
            sql=data.get("sql") or {},
            analytics=data.get("analytics") or {},
            root_cause=data.get("root_cause"),
            trace=data.get("trace") or [],
        )



