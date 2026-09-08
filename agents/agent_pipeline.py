"""Unified Agent Pipeline coordinating Intent, SQL, Analytics, and RCA Agents."""

import logging
from typing import Any, Dict, List, Optional, Union

from llm.base import BaseLLMClient
from llm.groq_client import GroqClient
from models.schemas import (
    DatabaseSchema,
    IntentOutput,
    PipelineResult,
    SQLOutput,
    AnalyticsOutput,
    RootCauseOutput,
)
from models.mock_schema import get_mock_schema_by_domain, ECOMMERCE_SCHEMA, HRMS_SCHEMA
from models.mock_data import (
    MOCK_MONTHLY_REVENUE_TREND,
    MOCK_REVENUE_BY_CATEGORY,
    MOCK_SINGLE_KPI_THIS_MONTH,
    MOCK_EMPLOYEE_DISTRIBUTION,
    MOCK_DECLINING_SALES_SCENARIO,
    MOCK_RCA_BASELINE,
    MOCK_RCA_EVIDENCE_CATEGORY,
    MOCK_RCA_EVIDENCE_REGION,
    MOCK_RCA_EVIDENCE_VOLUME_AOV,
    MOCK_RCA_EVIDENCE_CANCELLATION,
)
from agents.intent_agent import IntentAgent
from agents.sql_agent import SQLAgent
from agents.analytics_agent import AnalyticsAgent
from agents.root_cause_agent import RootCauseAgent

logger = logging.getLogger(__name__)


class AgentPipeline:
    """Central orchestrator managing multi-agent execution and analysis routing."""

    def __init__(
        self,
        llm_client: Optional[BaseLLMClient] = None,
        intent_agent: Optional[IntentAgent] = None,
        sql_agent: Optional[SQLAgent] = None,
        analytics_agent: Optional[AnalyticsAgent] = None,
        root_cause_agent: Optional[RootCauseAgent] = None,
    ) -> None:
        """Initialize the unified pipeline and child agents.

        Args:
            llm_client: Shared LLM client (defaults to centralized GroqClient).
            intent_agent: Optional custom IntentAgent.
            sql_agent: Optional custom SQLAgent.
            analytics_agent: Optional custom AnalyticsAgent.
            root_cause_agent: Optional custom RootCauseAgent.
        """
        self.llm_client = llm_client or GroqClient()
        self.intent_agent = intent_agent or IntentAgent(llm_client=self.llm_client)
        self.sql_agent = sql_agent or SQLAgent(llm_client=self.llm_client)
        self.analytics_agent = analytics_agent or AnalyticsAgent(llm_client=self.llm_client)
        self.root_cause_agent = root_cause_agent or RootCauseAgent(llm_client=self.llm_client)

    def process_question(
        self,
        question: str,
        schema_override: Optional[DatabaseSchema] = None,
        mock_data_override: Optional[List[Dict[str, Any]]] = None,
    ) -> PipelineResult:
        """Process a natural language business question through the multi-agent pipeline.

        Flow:
        1. User Question
        2. Intent Classification (Intent Agent)
        3. Schema-Aware SQL Generation (SQL Agent)
        4. Query Result Ingestion (Mock Data until MCP is connected)
        5. Statistical Analysis & Insights (Analytics Agent)
        6. Root-Cause Diagnostic Analysis (RCA Agent - routed only when applicable)

        Args:
            question: The natural language user query.
            schema_override: Optional DatabaseSchema override.
            mock_data_override: Optional query results list to bypass mock selector.

        Returns:
            Structured PipelineResult with trace.

        Raises:
            ValueError: If the question is empty or processing fails.
        """
        if not question or not question.strip():
            raise ValueError("User question cannot be empty.")

        trace: List[str] = []

        # =========================================================
        # Stage 1: Intent Classification
        # =========================================================
        intent: IntentOutput = self.intent_agent.parse_intent(question.strip())
        trace.append("intent")

        # =========================================================
        # Stage 2: Schema Resolution & SQL Generation
        # =========================================================
        schema = schema_override or get_mock_schema_by_domain(intent.domain)
        sql_res: SQLOutput = self.sql_agent.generate_sql(
            question=question.strip(),
            intent=intent,
            schema=schema,
        )
        trace.append("sql_generation")

        # =========================================================
        # Stage 3: Query Results Selection (Mock Data Layer)
        # =========================================================
        query_data = mock_data_override or self._select_mock_data(intent)

        # =========================================================
        # Stage 4: Analytics Agent Execution
        # =========================================================
        analytics_res: AnalyticsOutput = self.analytics_agent.analyze(
            question=question.strip(),
            intent=intent,
            sql=sql_res.sql,
            data=query_data,
        )
        trace.append("analytics")

        # =========================================================
        # Stage 5: Analysis Routing (Root Cause when applicable)
        # =========================================================
        rca_res: Optional[RootCauseOutput] = None
        if intent.is_root_cause_query or intent.analysis == "root_cause":
            # RCA Agent consumes the EXACT SAME query_data baseline as AnalyticsAgent
            baseline_data = query_data if len(query_data) >= 2 else MOCK_RCA_BASELINE
            evidence_map = {
                "category_decline": MOCK_RCA_EVIDENCE_CATEGORY,
                "regional_decline": MOCK_RCA_EVIDENCE_REGION,
                "volume_vs_aov_shift": MOCK_RCA_EVIDENCE_VOLUME_AOV,
                "cancellation_rate_increase": MOCK_RCA_EVIDENCE_CANCELLATION,
            }
            rca_res = self.root_cause_agent.diagnose(
                question=question.strip(),
                intent=intent,
                baseline_data=baseline_data,
                evidence_data_map=evidence_map,
                schema=schema,
            )
            trace.append("root_cause")

        return PipelineResult(
            query=question.strip(),
            intent=intent.to_dict(),
            sql=sql_res.to_dict(),
            analytics=analytics_res.to_dict(),
            root_cause=rca_res.to_dict() if rca_res else None,
            trace=trace,
        )

    def _select_mock_data(self, intent: IntentOutput) -> List[Dict[str, Any]]:
        """Select appropriate mock dataset based on extracted intent."""
        if intent.domain in ("hr", "hrms", "employee") or intent.grouping == "department":
            return MOCK_EMPLOYEE_DISTRIBUTION

        if intent.is_root_cause_query or intent.analysis == "root_cause":
            return MOCK_DECLINING_SALES_SCENARIO

        if intent.grouping == "category" or intent.analysis == "breakdown":
            return MOCK_REVENUE_BY_CATEGORY

        if intent.analysis in ("aggregate", "kpi", "total") and not intent.grouping:
            return MOCK_SINGLE_KPI_THIS_MONTH

        if intent.analysis == "trend" or intent.grouping in ("month", "quarter", "year"):
            return MOCK_MONTHLY_REVENUE_TREND

        return MOCK_MONTHLY_REVENUE_TREND
