"""Additive multi-source extension for the existing AgentVerse orchestrator."""

from typing import Any, Dict

from orchestrator.orchestrator import Orchestrator as SingleSourceOrchestrator
from orchestrator.analysis_evidence import build_analysis_evidence
from orchestrator.source_router import SourceRouter
from orchestrator.sql_execution_guard import SQLExecutionError, SQLExecutionGuard


class MultiSourceOrchestrator(SingleSourceOrchestrator):
    """Use the legacy path when possible and independently query selected MCP sources."""

    def __init__(self, *args, source_router=None, execution_guard=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.source_router = source_router or SourceRouter()
        self.execution_guard = execution_guard or SQLExecutionGuard(max_retries=2)

    def handle_query(self, query: str, session_id: str = "default") -> Dict[str, Any]:
        query = (query or "").strip()
        session_id = (session_id or "default").strip()
        if not query:
            return self._with_evidence(super().handle_query(query, session_id))

        context_text = self.context.as_prompt(session_id)
        trace = ["query_received"]
        try:
            intent = self._retry_once(
                self.pipeline.intent_agent.parse_intent, query, context_text or None,
            )
            trace.append("intent_complete")
            source_tables = {
                source: self.mcp.list_tables(source)
                for source in self.mcp.list_sources()
            }
            sources = self.source_router.select(query, source_tables)
            trace.append("sources_selected")
        except Exception as exc:
            return self._error(query, session_id, "source_selection", str(exc), trace)


        rows = []
        queries = []
        source_results = []
        result_validations = []
        sql_retries = []
        schemas = {}
        for source in sources:
            try:
                schema = self.mcp.get_schema(source)
                schemas[source] = schema
                source_context = (
                    (f"{context_text}\n" if context_text else "")
                    + f"Selected MCP source: {source}. "
                    + (
                        "This is one portion of a multi-database request. Return facts from "
                        "this source that contribute to the requested comparison. "
                        if len(sources) > 1 else ""
                    )
                    + "Use only the supplied schema and generate one read-only query."
                )
                sql_result = self.pipeline.sql_agent.generate_sql(
                    query, intent, schema, context=source_context,
                )
                outcome = self.execution_guard.execute(
                    question=query,
                    intent=intent,
                    source=source,
                    schema=schema,
                    sql_result=sql_result,
                    validator=self.validator,
                    mcp=self.mcp,
                    sql_agent=self.pipeline.sql_agent,
                    context=source_context,
                )
            except SQLExecutionError as exc:
                sql_retries.extend(exc.retries)
                response = self._extended_error(
                    query, session_id, "source_execution", f"{source}: {exc}",
                    trace, intent.to_dict(), sources, queries, source,
                )
                response["sqlRetries"] = sql_retries
                return response
            except Exception as exc:
                return self._extended_error(
                    query, session_id, "source_execution", f"{source}: {exc}",
                    trace, intent.to_dict(), sources, queries, source,
                )

            sql_result = outcome.sql_result
            source_rows = outcome.rows
            sql_retries.extend(outcome.retries)
            result_validations.append({
                "source": source,
                **outcome.result_validation,
            })
            queries.append({
                "source": source,
                "sql": outcome.sql,
                "tablesUsed": list(sql_result.tables_used),
                "columnsUsed": list(sql_result.columns_used),
            })
            source_results.append({"source": source, "rowCount": len(source_rows)})
            rows.extend(
                ({**row, "_source": source} for row in source_rows)
                if len(sources) > 1 else source_rows
            )

        trace.extend(["schema_discovered", "sql_generated", "sql_validated", "query_executed"])
        if sql_retries:
            trace.append("sql_self_correction_complete")
        trace.append("result_validated")
        combined_sql = "\n\n".join(
            f"-- Source: {item['source']}\n{item['sql']}" for item in queries
        )
        analytics = self._analytics_with_fallback(query, intent, combined_sql, rows, trace)
        root_cause = self._root_cause_if_needed(
            query, intent, rows, schemas[sources[0]], trace,
        )
        visualizations = self._visualization_with_fallback(intent, rows, trace)
        self.context.update(session_id, query, intent.to_dict())
        response = {
            "status": "success", "query": query, "sessionId": session_id,
            "intent": intent.to_dict(),
            "source": sources[0] if len(sources) == 1 else "multi_source",
            "sources": sources, "queries": queries, "sourceResults": source_results,
            "sqlRetries": sql_retries, "resultValidation": result_validations,
            "sql": queries[0]["sql"] if len(queries) == 1 else combined_sql,
            "data": rows, "visualizations": visualizations,
            "insight": analytics.get("summary", ""), "analytics": analytics,
            "rootCause": root_cause,
            "recommendations": (root_cause or analytics).get("recommendations", []),
            "trace": trace, "error": None,
        }

        return self._with_evidence(response, queries)

    @staticmethod
    def _with_evidence(response, query_details=None):
        if response.get("status") != "success":
            return response
        response["answer"] = response.get("insight", "")
        response["analysisEvidence"] = build_analysis_evidence(response, query_details)
        return response

    @classmethod
    def _extended_error(
        cls, query, session_id, stage, message, trace, intent, sources, queries, source,
    ):
        response = cls._error(
            query, session_id, stage, message, trace,
            intent=intent, source=source,
        )
        response.update({"sources": sources, "queries": queries, "sourceResults": []})
        return response

