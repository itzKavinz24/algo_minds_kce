"""End-to-end workflow coordinator for AgentVerse."""

import logging
import os
from typing import Any, Dict, Optional

from agents.agent_pipeline import AgentPipeline
from agents.visualization_agent import VisualizationAgent
from enterprise_mcp.client import EnterpriseMCPClient, MockEnterpriseMCPClient
from enterprise_mcp.real_client import RealEnterpriseMCPClient
from models.mock_data import (
    MOCK_RCA_EVIDENCE_CANCELLATION,
    MOCK_RCA_EVIDENCE_CATEGORY,
    MOCK_RCA_EVIDENCE_REGION,
    MOCK_RCA_EVIDENCE_VOLUME_AOV,
)
from orchestrator.context_manager import ContextManager
from security.sql_validator import SQLValidator

logger = logging.getLogger(__name__)


class Orchestrator:
    """Controls major stages while keeping agent and data-source contracts replaceable."""

    def __init__(
        self,
        pipeline: Optional[AgentPipeline] = None,
        mcp_client: Optional[EnterpriseMCPClient] = None,
        validator: Optional[SQLValidator] = None,
        visualization_agent: Optional[VisualizationAgent] = None,
        context_manager: Optional[ContextManager] = None,
    ) -> None:
        self.pipeline = pipeline or AgentPipeline()
        if mcp_client is not None:
            self.mcp = mcp_client
        elif os.getenv("MCP_MODE", "mock").strip().lower() == "real":
            self.mcp = RealEnterpriseMCPClient()
        else:
            self.mcp = MockEnterpriseMCPClient()
        self.validator = validator or SQLValidator()
        self.visualization_agent = visualization_agent or VisualizationAgent()
        self.context = context_manager or ContextManager()

    def handle_query(self, query: str, session_id: str = "default") -> Dict[str, Any]:
        query = (query or "").strip()
        session_id = (session_id or "default").strip()
        if not query:
            return self._error(query, session_id, "receive_query", "Query cannot be empty.", [])

        trace = ["query_received"]
        context_text = self.context.as_prompt(session_id)

        try:
            intent = self._retry_once(self.pipeline.intent_agent.parse_intent, query, context_text or None)
            trace.append("intent_complete")
        except Exception as exc:
            return self._error(query, session_id, "intent", str(exc), trace)

        source = "hrms_db" if intent.domain in ("hr", "hrms", "employee", "human_resources") else "ecommerce_db"
        try:
            schema = self.mcp.get_schema(source)
            trace.append("schema_discovered")
            sql_result = self.pipeline.sql_agent.generate_sql(query, intent, schema, context=context_text or None)
            trace.append("sql_generated")
        except Exception as exc:
            return self._error(query, session_id, "sql_generation", str(exc), trace, intent=intent.to_dict(), source=source)

        validation = self.validator.validate(sql_result.sql, schema, sql_result.tables_used)
        if not validation.safe:
            trace.append("sql_rejected")
            return self._error(
                query, session_id, "validation", "; ".join(validation.errors), trace,
                intent=intent.to_dict(), source=source, sql=sql_result.to_dict(),
            )
        trace.append("sql_validated")

        try:
            rows = self.mcp.execute_read_query(source, validation.sql)
            trace.append("query_executed")
        except Exception as exc:
            return self._error(
                query, session_id, "execution", f"Data source unavailable: {exc}", trace,
                intent=intent.to_dict(), source=source, sql=sql_result.to_dict(),
            )

        analytics = self._analytics_with_fallback(query, intent, validation.sql, rows, trace)
        root_cause = self._root_cause_if_needed(query, intent, rows, schema, trace)
        visualizations = self._visualization_with_fallback(intent, rows, trace)

        self.context.update(session_id, query, intent.to_dict())
        return {
            "status": "success", "query": query, "sessionId": session_id,
            "intent": intent.to_dict(), "source": source, "sql": validation.sql,
            "data": rows, "visualizations": visualizations,
            "insight": analytics.get("summary", ""), "analytics": analytics,
            "rootCause": root_cause,
            "recommendations": (root_cause or analytics).get("recommendations", []),
            "trace": trace, "error": None,
        }

    @staticmethod
    def _retry_once(function, *args):
        try:
            return function(*args)
        except Exception:
            return function(*args)

    def _analytics_with_fallback(self, query, intent, sql, rows, trace):
        try:
            result = self.pipeline.analytics_agent.analyze(query, intent, sql, rows).to_dict()
            trace.append("analytics_complete")
            return result
        except Exception as exc:
            logger.exception("Analytics agent failed: %s", exc)
            trace.append("analytics_fallback")
            return {"summary": "Data retrieved successfully; automated insight generation was unavailable.", "recommendations": []}

    def _root_cause_if_needed(self, query, intent, rows, schema, trace):
        if not (intent.is_root_cause_query or intent.analysis == "root_cause"):
            return None
        try:
            evidence = {
                "category_decline": MOCK_RCA_EVIDENCE_CATEGORY,
                "regional_decline": MOCK_RCA_EVIDENCE_REGION,
                "volume_vs_aov_shift": MOCK_RCA_EVIDENCE_VOLUME_AOV,
                "cancellation_rate_increase": MOCK_RCA_EVIDENCE_CANCELLATION,
            }
            result = self.pipeline.root_cause_agent.diagnose(query, intent, rows, evidence, schema).to_dict()
            trace.append("root_cause_complete")
            return result
        except Exception as exc:
            logger.exception("Root-cause workflow failed: %s", exc)
            trace.append("root_cause_fallback")
            return None

    def _visualization_with_fallback(self, intent, rows, trace):
        try:
            specs = self.visualization_agent.build_spec(intent, rows)
            trace.append("visualization_complete")
            return specs
        except Exception as exc:
            logger.exception("Visualization agent failed: %s", exc)
            trace.append("visualization_fallback")
            return [{"type": "table", "title": "Query Results", "columns": list(rows[0]) if rows else []}]

    @staticmethod
    def _error(query, session_id, stage, message, trace, **partial):
        return {
            "status": "error", "query": query, "sessionId": session_id,
            "intent": partial.get("intent"), "source": partial.get("source"),
            "sql": (partial.get("sql") or {}).get("sql"), "data": [],
            "visualizations": [], "insight": "", "analytics": {}, "rootCause": None,
            "recommendations": [], "trace": trace,
            "error": {"stage": stage, "message": message},
        }
