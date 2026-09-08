"""Analytics Agent implementation for AgentVerse Agent Layer."""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple, Union

from llm.base import BaseLLMClient
from llm.groq_client import GroqClient
from models.schemas import AnalyticsOutput, IntentOutput
from prompts.analytics import build_analytics_prompt

logger = logging.getLogger(__name__)


class AnalyticsAgent:
    """Agent responsible for performing deterministic computations on SQL results

    and generating structured business intelligence insights via LLM.
    """

    def __init__(
        self,
        llm_client: Optional[BaseLLMClient] = None,
        model: Optional[str] = None,
    ) -> None:
        """Initialize the Analytics Agent.

        Args:
            llm_client: LLM client instance (defaults to GroqClient).
            model: Optional model identifier override.
        """
        self.llm_client = llm_client or GroqClient()
        self.model = model

    def analyze(
        self,
        question: str,
        intent: Union[IntentOutput, Dict[str, Any]],
        sql: str,
        data: List[Dict[str, Any]],
        context: Optional[str] = None,
    ) -> AnalyticsOutput:
        """Analyze query results and produce structured analytics output.

        Args:
            question: Original natural language user question.
            intent: Structured IntentOutput object or dict.
            sql: The executed SQL query.
            data: Raw list of record dicts returned by the database.
            context: Optional conversational or diagnostic context.

        Returns:
            Structured AnalyticsOutput with summary, insights, and recommendations.

        Raises:
            ValueError: If input validation fails.
            RuntimeError: If LLM invocation or parsing fails.
        """
        # 1. Validate inputs
        if not question or not question.strip():
            raise ValueError("Question cannot be empty.")

        if isinstance(intent, dict):
            intent_obj = IntentOutput.from_dict(intent, raw_query=question.strip())
        elif isinstance(intent, IntentOutput):
            intent_obj = intent
        else:
            raise ValueError("Intent must be an IntentOutput instance or dictionary.")

        if not isinstance(data, list):
            raise ValueError("Query results 'data' must be a list of row dictionaries.")

        # 2. Handle empty results gracefully
        if len(data) == 0:
            return AnalyticsOutput(
                summary="No records matched the specified criteria.",
                key_insights=["The database query returned 0 rows for the requested timeframe and filters."],
                computed_metrics={"row_count": 0, "status": "empty"},
                trend_direction=None,
                anomalies=[],
                recommendations=["Verify date ranges and filter parameters or check data ingestion."],
                suggested_chart_type="table",
            )

        # 3. Deterministic Statistical Calculations (Pure Python - No LLM Hallucination for Math)
        calc_metrics = self.calculate_statistics(data=data, intent=intent_obj)

        # 4. Build LLM prompt with pre-calculated numbers
        messages = build_analytics_prompt(
            question=question.strip(),
            intent_dict=intent_obj.to_dict(),
            sql=sql.strip() if sql else "",
            data=data,
            calculated_metrics=calc_metrics,
            context=context,
        )

        # 5. Invoke LLM for natural language interpretation
        raw_response = self.llm_client.generate(
            messages=messages,
            model=self.model,
            temperature=0.0,  # Deterministic generation
        )

        # 6. Parse and merge
        parsed_data = self._clean_and_parse_json(raw_response)
        analytics_out = AnalyticsOutput.from_dict(parsed_data)

        # Always attach deterministic calculations to ensure factual integrity
        analytics_out.computed_metrics = calc_metrics

        # Fallback trend direction from deterministic calculation if LLM omitted it
        if not analytics_out.trend_direction and "trend" in calc_metrics:
            analytics_out.trend_direction = calc_metrics["trend"]

        return analytics_out

    def calculate_statistics(
        self,
        data: List[Dict[str, Any]],
        intent: Optional[IntentOutput] = None,
    ) -> Dict[str, Any]:
        """Perform deterministic mathematical calculations over raw tabular data.

        Calculates:
        - Single KPI / Scalar values
        - Time series: Total, average, start/end delta, overall change %, MoM/step change %s, trend direction
        - Category Breakdown / Distribution: Total, highest, lowest, category % shares, concentration
        """
        if not data:
            return {"row_count": 0}

        row_count = len(data)
        metrics: Dict[str, Any] = {"row_count": row_count}

        # Identify numeric vs categorical columns
        numeric_cols, categorical_cols = self._detect_column_types(data)

        if not numeric_cols:
            return metrics

        primary_num_col = numeric_cols[0]
        primary_cat_col = categorical_cols[0] if categorical_cols else None

        values = [float(row[primary_num_col]) for row in data if row.get(primary_num_col) is not None]

        if not values:
            return metrics

        total_sum = round(sum(values), 2)
        avg_val = round(total_sum / len(values), 2)
        min_val = round(min(values), 2)
        max_val = round(max(values), 2)

        metrics["primary_metric"] = primary_num_col
        metrics["total_sum"] = total_sum
        metrics["average"] = avg_val
        metrics["min_value"] = min_val
        metrics["max_value"] = max_val

        # Case A: Single KPI
        if row_count == 1:
            metrics["scalar_value"] = values[0]
            metrics["analysis_type"] = "single_kpi"
            return metrics

        # Case B: Time series / Trend analysis
        is_trend = (intent and intent.analysis == "trend") or (
            primary_cat_col and any(k in primary_cat_col.lower() for k in ("month", "date", "year", "quarter", "day"))
        )

        if is_trend and row_count >= 2:
            metrics["analysis_type"] = "trend"
            start_val = values[0]
            end_val = values[-1]
            change_amt = round(end_val - start_val, 2)
            change_pct = round(((end_val - start_val) / start_val) * 100, 2) if start_val != 0 else 0.0

            metrics["start_value"] = start_val
            metrics["end_value"] = end_val
            metrics["overall_change_amount"] = change_amt
            metrics["overall_change_pct"] = change_pct

            # Period-over-period percentage changes
            step_changes: List[Dict[str, Any]] = []
            for i in range(1, len(values)):
                prev = values[i - 1]
                curr = values[i]
                step_pct = round(((curr - prev) / prev) * 100, 2) if prev != 0 else 0.0
                label = data[i].get(primary_cat_col, f"Period {i}") if primary_cat_col else f"Period {i}"
                step_changes.append({"period": str(label), "change_pct": step_pct, "delta": round(curr - prev, 2)})

            metrics["step_changes"] = step_changes

            # Determine overall trend direction
            if change_pct > 5.0:
                metrics["trend"] = "increasing"
            elif change_pct < -5.0:
                metrics["trend"] = "decreasing"
            else:
                metrics["trend"] = "stable"

            # Check for anomalies / sharp drops
            anomalies = []
            for sc in step_changes:
                if sc["change_pct"] <= -15.0:
                    anomalies.append(f"Sharp decline of {sc['change_pct']}% detected in {sc['period']}.")
                elif sc["change_pct"] >= 50.0:
                    anomalies.append(f"Notable spike of +{sc['change_pct']}% detected in {sc['period']}.")
            metrics["detected_anomalies"] = anomalies

        # Case C: Categorical Breakdown / Distribution
        elif primary_cat_col:
            metrics["analysis_type"] = "distribution"
            shares: List[Dict[str, Any]] = []
            for row in data:
                cat_name = str(row.get(primary_cat_col, "Unknown"))
                val = float(row.get(primary_num_col, 0.0))
                share_pct = round((val / total_sum) * 100, 2) if total_sum != 0 else 0.0
                shares.append({"label": cat_name, "value": val, "share_pct": share_pct})

            shares_sorted = sorted(shares, key=lambda x: x["value"], reverse=True)
            metrics["category_shares"] = shares_sorted
            metrics["highest_segment"] = shares_sorted[0] if shares_sorted else None
            metrics["lowest_segment"] = shares_sorted[-1] if shares_sorted else None

            if len(shares_sorted) >= 2:
                top_2_sum = shares_sorted[0]["value"] + shares_sorted[1]["value"]
                metrics["top_2_concentration_pct"] = round((top_2_sum / total_sum) * 100, 2) if total_sum != 0 else 0.0

        return metrics

    def _detect_column_types(self, data: List[Dict[str, Any]]) -> Tuple[List[str], List[str]]:
        """Identify which columns in tabular data are numeric and which are categorical."""
        if not data:
            return [], []

        sample_row = data[0]
        numeric_cols = []
        categorical_cols = []

        for col, val in sample_row.items():
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                numeric_cols.append(col)
            elif isinstance(val, str):
                # Check if it represents a convertible numeric value
                try:
                    float(val)
                    numeric_cols.append(col)
                except ValueError:
                    categorical_cols.append(col)
            else:
                categorical_cols.append(col)

        return numeric_cols, categorical_cols

    def _clean_and_parse_json(self, response_text: str) -> Dict[str, Any]:
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

        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            json_str = match.group(0)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                fixed_json = re.sub(r",\s*([\]}])", r"\1", json_str)
                try:
                    return json.loads(fixed_json)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Malformed JSON from LLM: {e}. Raw: {response_text}") from e

        raise ValueError(f"No valid JSON found in LLM response: '{response_text}'")
