"""Deterministic visualization-spec agent for the frontend ChartRenderer."""

from typing import Any, Dict, List

from models.schemas import IntentOutput


class VisualizationAgent:
    def build_spec(self, intent: IntentOutput, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not data:
            return []
        columns = list(data[0])
        numeric = [key for key, value in data[0].items() if isinstance(value, (int, float))]
        categorical = [key for key in columns if key not in numeric]
        y_axis = numeric[0] if numeric else (columns[-1] if columns else "value")
        x_axis = categorical[0] if categorical else (columns[0] if columns else "label")

        if len(data) == 1 and numeric:
            chart_type = "kpi"
        elif intent.analysis == "trend" or intent.grouping in ("month", "quarter", "year"):
            chart_type = "line"
        elif intent.analysis in ("breakdown", "distribution") or intent.grouping:
            chart_type = "bar"
        else:
            chart_type = "table"

        title_metric = (intent.metric or y_axis).replace("_", " ").title()
        title = title_metric if chart_type == "kpi" else f"{title_metric} by {x_axis.replace('_', ' ').title()}"
        spec = {"type": chart_type, "title": title, "x": x_axis, "y": y_axis}
        if chart_type == "table":
            spec["columns"] = columns
        return [spec]
