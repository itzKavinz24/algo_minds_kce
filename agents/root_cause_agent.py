"""Root-Cause Analysis (RCA) Agent implementation for AgentVerse Agent Layer."""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Union

from llm.base import BaseLLMClient
from llm.groq_client import GroqClient
from models.schemas import (
    BaselineComparison,
    DatabaseSchema,
    EvidenceQuery,
    EvidenceResult,
    IntentOutput,
    RootCauseHypothesis,
    RootCauseOutput,
)
from prompts.root_cause import build_hypothesis_prompt, build_synthesis_prompt

logger = logging.getLogger(__name__)


class RootCauseAgent:
    """Agent responsible for multi-step diagnostic reasoning, hypothesis generation,

    evidence evaluation, and root-cause determination.
    """

    def __init__(
        self,
        llm_client: Optional[BaseLLMClient] = None,
        model: Optional[str] = None,
    ) -> None:
        """Initialize the Root-Cause Analysis Agent.

        Args:
            llm_client: LLM client instance (defaults to GroqClient).
            model: Optional model identifier override.
        """
        self.llm_client = llm_client or GroqClient()
        self.model = model

    def calculate_baseline(
        self,
        baseline_data: List[Dict[str, Any]],
        metric_name: str = "sales",
    ) -> BaselineComparison:
        """Calculate baseline performance comparison from historical time series or period records.

        Args:
            baseline_data: List of 2+ record dicts (chronological: [previous_period, current_period]).
            metric_name: Name of the target metric being evaluated.

        Returns:
            BaselineComparison object with exact delta amount and percent change.

        Raises:
            ValueError: If baseline_data has fewer than 2 records or missing values.
        """
        if not baseline_data or len(baseline_data) < 2:
            raise ValueError("Baseline data must contain at least 2 period records to establish a comparison.")

        # Identify numeric column in the baseline records
        sample_row = baseline_data[0]
        num_cols = [k for k, v in sample_row.items() if isinstance(v, (int, float)) and not isinstance(v, bool)]
        dim_cols = [k for k in sample_row.keys() if k not in num_cols]

        if not num_cols:
            raise ValueError("No numeric metric column found in baseline data.")

        metric_col = num_cols[0]
        dim_col = dim_cols[0] if dim_cols else "period"

        prev_row = baseline_data[-2]
        curr_row = baseline_data[-1]

        prev_val = float(prev_row.get(metric_col, 0.0))
        curr_val = float(curr_row.get(metric_col, 0.0))
        prev_period = str(prev_row.get(dim_col, "previous_period"))
        curr_period = str(curr_row.get(dim_col, "current_period"))

        delta_amt = round(curr_val - prev_val, 2)
        pct_change = round(((curr_val - prev_val) / prev_val) * 100, 2) if prev_val != 0 else 0.0

        return BaselineComparison(
            current_period=curr_period,
            previous_period=prev_period,
            current_value=curr_val,
            previous_value=prev_val,
            change_amount=delta_amt,
            change_percent=pct_change,
            metric_name=metric_name,
        )

    def generate_hypotheses(
        self,
        question: str,
        intent: Union[IntentOutput, Dict[str, Any]],
        baseline: BaselineComparison,
        schema: Optional[DatabaseSchema] = None,
        context: Optional[str] = None,
    ) -> List[RootCauseHypothesis]:
        """Formulate testable diagnostic hypotheses and required evidence queries.

        Args:
            question: Original natural language diagnostic question.
            intent: Structured intent from IntentAgent.
            baseline: Established baseline comparison.
            schema: Optional database schema context.
            context: Optional conversational or domain context.

        Returns:
            List of RootCauseHypothesis instances.
        """
        intent_obj = intent if isinstance(intent, IntentOutput) else IntentOutput.from_dict(intent, raw_query=question)
        baseline_summary = (
            f"{baseline.metric_name.capitalize()} changed from {baseline.previous_value:,.2f} ({baseline.previous_period}) "
            f"to {baseline.current_value:,.2f} ({baseline.current_period}) "
            f"[{baseline.change_percent:+.2f}% / {baseline.change_amount:+,.2f}]."
        )
        schema_text = schema.format_for_prompt() if schema else None

        messages = build_hypothesis_prompt(
            question=question.strip(),
            intent_dict=intent_obj.to_dict(),
            baseline_summary=baseline_summary,
            schema_text=schema_text,
            context=context,
        )

        raw_response = self.llm_client.generate(
            messages=messages,
            model=self.model,
            temperature=0.0,
        )

        parsed_data = self._clean_and_parse_json(raw_response)
        if not isinstance(parsed_data, list):
            if isinstance(parsed_data, dict) and "hypotheses" in parsed_data:
                parsed_data = parsed_data["hypotheses"]
            else:
                parsed_data = [parsed_data]

        hypotheses: List[RootCauseHypothesis] = []
        for item in parsed_data:
            if isinstance(item, dict):
                hypotheses.append(RootCauseHypothesis.from_dict(item))

        return hypotheses

    def calculate_evidence_contribution(
        self,
        hypothesis_id: str,
        evidence_data: List[Dict[str, Any]],
        baseline: BaselineComparison,
    ) -> Dict[str, Any]:
        """Perform deterministic mathematical calculations evaluating the contribution of an evidence factor.

        Calculates:
        - Factor-specific changes and percentage drops
        - Contribution to total net decline: (factor_drop / total_drop) * 100
        """
        if not evidence_data:
            return {"status": "insufficient_evidence", "row_count": 0}

        total_net_decline = abs(baseline.change_amount) if baseline.change_amount < 0 else 1.0

        # Case 1: Dimension breakdown records with previous and current sales or delta
        segment_contributions = []
        for row in evidence_data:
            # Check for categorical item representation
            cat_name = row.get("category") or row.get("region") or row.get("department") or row.get("segment") or row.get("dimension")
            if cat_name:
                prev = float(row.get("previous_period_sales", row.get("previous_period", row.get("previous", 0.0))))
                curr = float(row.get("current_period_sales", row.get("current_period", row.get("current", 0.0))))
                delta = float(row.get("delta", curr - prev))
                chg_pct = float(row.get("change_pct", round(((curr - prev) / prev * 100), 2) if prev != 0 else 0.0))

                # Contribution to total decline (if negative delta)
                contrib_pct = round((abs(delta) / total_net_decline) * 100, 2) if delta < 0 and total_net_decline > 0 else 0.0

                segment_contributions.append({
                    "segment": str(cat_name),
                    "previous": prev,
                    "current": curr,
                    "delta": delta,
                    "change_pct": chg_pct,
                    "contribution_to_total_decline_pct": contrib_pct,
                })

        if segment_contributions:
            sorted_segments = sorted(segment_contributions, key=lambda x: x["contribution_to_total_decline_pct"], reverse=True)
            top_contributor = sorted_segments[0]
            return {
                "type": "dimension_breakdown",
                "segments": sorted_segments,
                "top_contributor": top_contributor,
                "top_contribution_pct": top_contributor["contribution_to_total_decline_pct"],
            }

        # Case 2: Metric comparisons (e.g. Order volume vs AOV)
        metrics_eval = []
        for row in evidence_data:
            metric_label = row.get("metric")
            if metric_label:
                chg_pct = float(row.get("change_pct", 0.0))
                metrics_eval.append({"metric": str(metric_label), "change_pct": chg_pct})

        if metrics_eval:
            return {"type": "metric_comparison", "metrics": metrics_eval}

        # Case 3: Rate comparisons (e.g. cancellation rate)
        return {"type": "general_evidence", "raw_rows": evidence_data}

    def analyze_evidence(
        self,
        question: str,
        intent: Union[IntentOutput, Dict[str, Any]],
        baseline: BaselineComparison,
        hypotheses: List[RootCauseHypothesis],
        evidence_data_map: Dict[str, List[Dict[str, Any]]],
        context: Optional[str] = None,
    ) -> RootCauseOutput:
        """Analyze provided evidence results against hypotheses and synthesize root cause.

        Args:
            question: Original natural language question.
            intent: Structured intent.
            baseline: Established baseline comparison.
            hypotheses: Formulated hypotheses to evaluate.
            evidence_data_map: Dictionary mapping hypothesis_id -> raw query result rows.
            context: Optional diagnostic notes.

        Returns:
            Comprehensive RootCauseOutput containing verified findings, contributions, and recommendations.
        """
        intent_obj = intent if isinstance(intent, IntentOutput) else IntentOutput.from_dict(intent, raw_query=question)

        # 1. Deterministic Math on Evidence Data
        evaluated_evidence: List[Dict[str, Any]] = []
        for hyp in hypotheses:
            data = evidence_data_map.get(hyp.id, [])
            calc_res = self.calculate_evidence_contribution(hyp.id, data, baseline)
            evaluated_evidence.append({
                "hypothesis_id": hyp.id,
                "description": hyp.description,
                "calculated_metrics": calc_res,
                "has_data": bool(data),
            })

        # 2. Build synthesis prompt with verified mathematics
        messages = build_synthesis_prompt(
            question=question.strip(),
            baseline_dict=baseline.to_dict(),
            hypotheses_dict=[h.to_dict() for h in hypotheses],
            evaluated_evidence=evaluated_evidence,
            context=context,
        )

        # 3. Invoke LLM for synthesis
        raw_response = self.llm_client.generate(
            messages=messages,
            model=self.model,
            temperature=0.0,
        )

        parsed_data = self._clean_and_parse_json(raw_response)

        # 4. Construct RootCauseOutput
        output = RootCauseOutput.from_dict(
            {
                "question": question,
                "baseline": baseline.to_dict(),
                "hypotheses": [h.to_dict() for h in hypotheses],
                **parsed_data,
            }
        )

        # 5. Enrich evidence items with exact deterministic contribution percentages
        for ev in output.evidence:
            data = evidence_data_map.get(ev.hypothesis_id, [])
            math_eval = self.calculate_evidence_contribution(ev.hypothesis_id, data, baseline)
            ev.data_summary = math_eval
            if math_eval.get("top_contribution_pct") is not None:
                ev.contribution_percent = math_eval["top_contribution_pct"]

        return output

    def diagnose(
        self,
        question: str,
        intent: Union[IntentOutput, Dict[str, Any]],
        baseline_data: List[Dict[str, Any]],
        evidence_data_map: Dict[str, List[Dict[str, Any]]],
        schema: Optional[DatabaseSchema] = None,
        context: Optional[str] = None,
    ) -> RootCauseOutput:
        """End-to-end diagnostic workflow: calculates baseline, generates hypotheses,

        evaluates evidence, and synthesizes root-cause findings.
        """
        baseline = self.calculate_baseline(baseline_data)
        hypotheses = self.generate_hypotheses(question, intent, baseline, schema=schema, context=context)
        return self.analyze_evidence(question, intent, baseline, hypotheses, evidence_data_map, context=context)

    def _clean_and_parse_json(self, response_text: str) -> Any:
        """Sanitize and parse JSON response from LLM."""
        text = response_text.strip()

        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
            text = re.sub(r"\s*```$", "", text)
            text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Extract array or object
        match = re.search(r"(\[[\s\S]*\]|\{[\s\S]*\})", text)
        if match:
            json_str = match.group(0)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                fixed_json = re.sub(r",\s*([\]}])", r"\1", json_str)
                try:
                    return json.loads(fixed_json)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Malformed JSON in RCA response: {e}. Raw: {response_text}") from e

        raise ValueError(f"No valid JSON found in RCA response: '{response_text}'")
