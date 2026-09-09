"""
Chart Service for Enterprise Analytics Report Generator.
Generates publication-quality, data-driven visualizations using Matplotlib.
Supports Bar, Horizontal Bar, Line, Donut, and Grouped Bar charts with Indian currency formatting.
"""

import io
import re
from typing import Optional, Dict, Any, List, Tuple
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np

from app.models.analysis_result import QueryResult, ColumnSpec
from app.utils.formatting import format_indian_number, format_currency, is_currency_column, humanize_column_name

# Enterprise Emerald Palette
PALETTE = [
    "#176B52",  # Primary Dark Emerald
    "#2FA87A",  # Mint Green
    "#48BE92",  # Medium Mint
    "#72B89D",  # Soft Sage
    "#99CCA4",  # Light Sage
    "#3E9B68",  # Accent Green
    "#D69A3A",  # Warm Amber
    "#4A7A96",  # Slate Blue
    "#7A6296",  # Soft Purple
    "#C86464",  # Muted Coral
]

DATE_KEYWORDS = {"date", "month", "year", "day", "quarter", "week", "period", "timestamp", "time"}


def _is_date_col(col_name: str) -> bool:
    lower = col_name.lower()
    return any(k in lower for k in DATE_KEYWORDS)


def _classify_columns(columns: List[ColumnSpec], rows: List[Dict[str, Any]]) -> Tuple[List[str], List[str], List[str]]:
    """Classify columns into (date_cols, categorical_cols, numeric_cols)."""
    date_cols = []
    cat_cols = []
    num_cols = []

    if not rows:
        return date_cols, cat_cols, num_cols

    sample_row = rows[0]

    for col in columns:
        name = col.name
        val = sample_row.get(name)
        dtype = (col.data_type or "").lower()

        # Check if numeric
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            num_cols.append(name)
        elif dtype in ("numeric", "integer", "float", "bigint", "double precision", "decimal", "real"):
            num_cols.append(name)
        elif _is_date_col(name) or (isinstance(val, str) and re.match(r"^\d{4}[-/]\d{2}", val)):
            date_cols.append(name)
        else:
            cat_cols.append(name)

    return date_cols, cat_cols, num_cols


def _format_axis_value(val: float, is_curr: bool) -> str:
    """Format large numbers for chart tick labels (e.g. 20L, 50K, 1.5Cr)."""
    if not is_curr:
        if abs(val) >= 1_00_00_000:
            return f"{val / 1_00_00_000:.1f}Cr"
        if abs(val) >= 1_00_000:
            return f"{val / 1_00_000:.1f}L"
        if abs(val) >= 1_000:
            return f"{val / 1_000:.0f}K"
        return f"{val:.0f}"

    if abs(val) >= 1_00_00_000:
        return f"₹{val / 1_00_00_000:.2f} Cr"
    if abs(val) >= 1_00_000:
        return f"₹{val / 1_00_000:.2f} L"
    if abs(val) >= 1_000:
        return f"₹{val / 1_000:.1f} K"
    return f"₹{val:.0f}"


class ChartService:
    """Service to analyze tabular query results and render clean charts."""

    @staticmethod
    def generate_chart(query_result: QueryResult, business_question: str = "") -> Optional[bytes]:
        """
        Analyze columns and rows to select and render the most appropriate chart.
        Returns PNG bytes or None if data cannot be meaningfully charted.
        """
        rows = query_result.rows
        columns = query_result.columns

        if not rows or len(rows) == 0:
            return None

        date_cols, cat_cols, num_cols = _classify_columns(columns, rows)

        if not num_cols:
            return None

        plt.rcParams["font.sans-serif"] = ["Segoe UI", "Arial", "DejaVu Sans", "Helvetica", "sans-serif"]
        plt.rcParams["axes.edgecolor"] = "#DDE6E1"
        plt.rcParams["axes.linewidth"] = 0.8

        try:
            # 1. Time-series Line Chart
            if date_cols and len(num_cols) >= 1:
                return ChartService._render_line_chart(rows, date_cols[0], num_cols[0], business_question)

            # 2. Categorical + Single Numeric -> Bar Chart
            if cat_cols and len(num_cols) == 1:
                cat_col = cat_cols[0]
                num_col = num_cols[0]

                # If 3 to 6 categories with percentage or share in question, consider Donut
                is_share = any(k in business_question.lower() for k in ["share", "distribution", "proportion", "breakdown"])
                if is_share and 3 <= len(rows) <= 6:
                    return ChartService._render_donut_chart(rows, cat_col, num_col, business_question)

                # Default to horizontal or vertical bar chart
                return ChartService._render_bar_chart(rows, cat_col, num_col, business_question)

            # 3. Categorical + Multiple Numeric -> Grouped Bar Chart
            if cat_cols and len(num_cols) >= 2:
                return ChartService._render_grouped_bar_chart(rows, cat_cols[0], num_cols[:3], business_question)

            # 4. Fallback: First column as category, first numeric as metric
            first_col = columns[0].name
            if first_col != num_cols[0]:
                return ChartService._render_bar_chart(rows, first_col, num_cols[0], business_question)

        except Exception as e:
            # Log error, do not fail entire report
            print(f"[Chart Generation Warning] Failed to render chart: {e}")
            return None

        return None

    @staticmethod
    def _render_bar_chart(rows: List[Dict[str, Any]], cat_col: str, num_col: str, title: str) -> bytes:
        """Render a clean horizontal or vertical bar chart with data labels."""
        # Extract and sort values
        data = []
        for r in rows:
            label = str(r.get(cat_col, "Unknown"))
            try:
                val = float(r.get(num_col, 0) or 0)
            except (ValueError, TypeError):
                val = 0.0
            data.append((label, val))

        # Limit to top 15 categories for clean visual display
        if len(data) > 15:
            data = sorted(data, key=lambda x: x[1], reverse=True)[:15]

        labels = [d[0] for d in data]
        values = [d[1] for d in data]
        is_curr = is_currency_column(num_col)

        # Decide between horizontal (better for long labels / 6+ items) and vertical
        use_horizontal = len(labels) >= 6 or any(len(str(l)) > 10 for l in labels)

        fig, ax = plt.subplots(figsize=(7.5, 4.2), dpi=300)
        fig.patch.set_facecolor("#FFFFFF")
        ax.set_facecolor("#FAFCFB")

        if use_horizontal:
            # Reverse so highest is at the top
            labels = labels[::-1]
            values = values[::-1]
            y_pos = np.arange(len(labels))

            colors = [PALETTE[0] if i == len(values)-1 else PALETTE[1] if i == len(values)-2 else PALETTE[3] for i in range(len(values))]
            bars = ax.barh(y_pos, values, color=colors, height=0.65, edgecolor="none", alpha=0.92)

            ax.set_yticks(y_pos)
            ax.set_yticklabels(labels, fontsize=8.5, color="#18221E", fontweight="500")
            ax.xaxis.grid(True, linestyle="--", alpha=0.5, color="#DDE6E1")
            ax.yaxis.grid(False)
            ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda x, pos: _format_axis_value(x, is_curr)))
            ax.set_xlabel(humanize_column_name(num_col), fontsize=9, color="#66736C", labelpad=6)

            # Add data label callout to the right of each bar
            max_val = max(values) if values else 1
            for bar, val in zip(bars, values):
                formatted_label = _format_axis_value(val, is_curr)
                ax.text(val + max_val * 0.015, bar.get_y() + bar.get_height() / 2, formatted_label,
                        va="center", ha="left", fontsize=7.5, color="#18221E", fontweight="bold")

            ax.set_xlim(0, max_val * 1.18)

        else:
            x_pos = np.arange(len(labels))
            colors = [PALETTE[0] if val == max(values) else PALETTE[1] for val in values]
            bars = ax.bar(x_pos, values, color=colors, width=0.55, edgecolor="none", alpha=0.92)

            ax.set_xticks(x_pos)
            ax.set_xticklabels(labels, fontsize=8.5, color="#18221E", fontweight="500", rotation=15, ha="right")
            ax.yaxis.grid(True, linestyle="--", alpha=0.5, color="#DDE6E1")
            ax.xaxis.grid(False)
            ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda y, pos: _format_axis_value(y, is_curr)))
            ax.set_ylabel(humanize_column_name(num_col), fontsize=9, color="#66736C", labelpad=6)

            max_val = max(values) if values else 1
            for bar, val in zip(bars, values):
                formatted_label = _format_axis_value(val, is_curr)
                ax.text(bar.get_x() + bar.get_width() / 2, val + max_val * 0.02, formatted_label,
                        va="bottom", ha="center", fontsize=7.5, color="#18221E", fontweight="bold")

            ax.set_ylim(0, max_val * 1.15)

        # Title
        chart_title = f"{humanize_column_name(num_col)} by {humanize_column_name(cat_col)}"
        ax.set_title(chart_title, fontsize=11, fontweight="bold", color="#18221E", pad=12, loc="left")

        # Clean borders
        for spine in ["top", "right"]:
            ax.spines[spine].set_visible(False)
        ax.spines["left"].set_color("#DDE6E1")
        ax.spines["bottom"].set_color("#DDE6E1")

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor())
        plt.close(fig)
        return buf.getvalue()

    @staticmethod
    def _render_line_chart(rows: List[Dict[str, Any]], date_col: str, num_col: str, title: str) -> bytes:
        """Render a clean time-series trend line chart with filled area and data markers."""
        labels = [str(r.get(date_col, "")) for r in rows]
        values = [float(r.get(num_col, 0) or 0) for r in rows]
        is_curr = is_currency_column(num_col)

        fig, ax = plt.subplots(figsize=(7.5, 3.8), dpi=300)
        fig.patch.set_facecolor("#FFFFFF")
        ax.set_facecolor("#FAFCFB")

        x_pos = np.arange(len(labels))

        # Main trend line
        line = ax.plot(x_pos, values, color="#176B52", linewidth=2.2, marker="o", markersize=5,
                       markerfacecolor="#FFFFFF", markeredgecolor="#176B52", markeredgewidth=1.8, zorder=4)

        # Area gradient fill
        ax.fill_between(x_pos, values, color="#176B52", alpha=0.10, zorder=2)

        ax.set_xticks(x_pos)
        ax.set_xticklabels(labels, fontsize=8.5, color="#18221E", fontweight="500", rotation=25, ha="right")
        ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda y, pos: _format_axis_value(y, is_curr)))
        ax.yaxis.grid(True, linestyle="--", alpha=0.5, color="#DDE6E1")
        ax.xaxis.grid(False)

        ax.set_ylabel(humanize_column_name(num_col), fontsize=9, color="#66736C", labelpad=6)
        chart_title = f"{humanize_column_name(num_col)} Trend ({humanize_column_name(date_col)})"
        ax.set_title(chart_title, fontsize=11, fontweight="bold", color="#18221E", pad=12, loc="left")

        for spine in ["top", "right"]:
            ax.spines[spine].set_visible(False)
        ax.spines["left"].set_color("#DDE6E1")
        ax.spines["bottom"].set_color("#DDE6E1")

        # Highlight peak
        if values:
            max_idx = np.argmax(values)
            max_val = values[max_idx]
            ax.annotate(f"Peak: {_format_axis_value(max_val, is_curr)}",
                        xy=(max_idx, max_val),
                        xytext=(max_idx, max_val + (max(values) - min(values)) * 0.12 if max(values) != min(values) else max_val * 1.05),
                        ha="center", fontsize=7.5, fontweight="bold", color="#176B52",
                        arrowprops=dict(arrowstyle="->", color="#176B52", lw=1))

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor())
        plt.close(fig)
        return buf.getvalue()

    @staticmethod
    def _render_donut_chart(rows: List[Dict[str, Any]], cat_col: str, num_col: str, title: str) -> bytes:
        """Render a clean Donut chart for proportional distributions."""
        labels = [str(r.get(cat_col, "")) for r in rows]
        values = [float(r.get(num_col, 0) or 0) for r in rows]

        fig, ax = plt.subplots(figsize=(7.5, 4.0), dpi=300)
        fig.patch.set_facecolor("#FFFFFF")

        colors = PALETTE[:len(labels)]
        wedges, texts, autotexts = ax.pie(
            values,
            labels=None,
            autopct="%1.1f%%",
            pctdistance=0.75,
            startangle=90,
            colors=colors,
            wedgeprops=dict(width=0.42, edgecolor="#FFFFFF", linewidth=2)
        )

        for autotext in autotexts:
            autotext.set_color("#18221E")
            autotext.set_fontsize(8)
            autotext.set_fontweight("bold")

        ax.legend(wedges, labels, title=humanize_column_name(cat_col), loc="center left",
                  bbox_to_anchor=(1, 0, 0.5, 1), fontsize=8, frameon=False)

        chart_title = f"{humanize_column_name(num_col)} Distribution"
        ax.set_title(chart_title, fontsize=11, fontweight="bold", color="#18221E", pad=12, loc="center")

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor())
        plt.close(fig)
        return buf.getvalue()

    @staticmethod
    def _render_grouped_bar_chart(rows: List[Dict[str, Any]], cat_col: str, num_cols: List[str], title: str) -> bytes:
        """Render a grouped comparison bar chart for multiple metrics."""
        labels = [str(r.get(cat_col, ""))[:12] for r in rows[:8]]
        x = np.arange(len(labels))
        width = 0.8 / len(num_cols)

        fig, ax = plt.subplots(figsize=(7.5, 4.0), dpi=300)
        fig.patch.set_facecolor("#FFFFFF")
        ax.set_facecolor("#FAFCFB")

        for idx, col in enumerate(num_cols):
            vals = [float(r.get(col, 0) or 0) for r in rows[:8]]
            offset = (idx - (len(num_cols) - 1) / 2) * width
            ax.bar(x + offset, vals, width, label=humanize_column_name(col),
                   color=PALETTE[idx % len(PALETTE)], alpha=0.9, edgecolor="none")

        ax.set_xticks(x)
        ax.set_xticklabels(labels, fontsize=8.5, color="#18221E", fontweight="500")
        ax.yaxis.grid(True, linestyle="--", alpha=0.5, color="#DDE6E1")
        ax.xaxis.grid(False)
        ax.legend(frameon=False, fontsize=8)

        chart_title = f"Comparison across {humanize_column_name(cat_col)}"
        ax.set_title(chart_title, fontsize=11, fontweight="bold", color="#18221E", pad=12, loc="left")

        for spine in ["top", "right"]:
            ax.spines[spine].set_visible(False)
        ax.spines["left"].set_color("#DDE6E1")
        ax.spines["bottom"].set_color("#DDE6E1")

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor())
        plt.close(fig)
        return buf.getvalue()
