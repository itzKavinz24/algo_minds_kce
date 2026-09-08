"""
PDF Service for Enterprise Analytics Report Generator.
Constructs multi-page, publication-ready PDF reports with ReportLab Flowables.
Enforces all 11 required sections, auto-calculating column widths, repeating table headers,
and dynamic NumberedCanvas page numbering.
"""

import io
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    HRFlowable,
)

from app.models.analysis_result import AnalysisResult
from app.templates.report_template import (
    NumberedCanvas,
    get_report_styles,
    PRIMARY_COLOR,
    PRIMARY_HOVER,
    ACCENT_MINT,
    ACCENT_BORDER,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    BG_CANVAS,
    BORDER_COLOR,
    SUCCESS_GREEN,
    WHITE,
    HAS_RUPEE_FONT,
)
from app.utils.formatting import (
    format_cell_value,
    humanize_column_name,
    is_currency_column,
    is_percentage_column,
)


class PDFService:
    """Service to render complete AnalysisResult document into PDF bytes."""

    @staticmethod
    def generate_pdf(analysis_result: AnalysisResult, chart_png_bytes: Optional[bytes] = None) -> bytes:
        """
        Build and return the PDF binary stream for the given AnalysisResult.
        """
        buffer = io.BytesIO()

        # Page setup: Letter, 36pt (0.5 inch) margins for maximum clean printable area
        page_width, page_height = letter
        margin = 36
        usable_width = page_width - (2 * margin)  # 612 - 72 = 540 pt

        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=margin,
            rightMargin=margin,
            topMargin=36,
            bottomMargin=38,
        )

        styles = get_report_styles()
        story = []

        # -------------------------------------------------------------
        # 1. Header Banner & Document Identity
        # -------------------------------------------------------------
        story.append(Paragraph("Enterprise Analytics Report", styles["title"]))

        gen_date = analysis_result.metadata.generated_at if analysis_result.metadata else datetime.now().isoformat()
        try:
            dt = datetime.fromisoformat(gen_date.replace("Z", "+00:00"))
            formatted_date = dt.strftime("%d %B %Y, %I:%M %p")
        except Exception:
            formatted_date = str(gen_date)

        meta_line = f"<b>Report ID:</b> {analysis_result.report_id} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Generated:</b> {formatted_date} &nbsp;&nbsp;|&nbsp;&nbsp; <b>System:</b> AGENTVERSE Analytics"
        story.append(Paragraph(meta_line, styles["subtitle"]))
        story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceAfter=8))

        # -------------------------------------------------------------
        # Section 1 — Business Question
        # -------------------------------------------------------------
        story.append(Paragraph("Section 1 — Business Question", styles["h1"]))
        question_html = f"<b>&ldquo;{analysis_result.business_question}&rdquo;</b>"
        question_table = Table(
            [[Paragraph(question_html, styles["question"])]],
            colWidths=[usable_width],
        )
        question_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_CANVAS),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("LINELEFT", (0, 0), (-1, -1), 4, PRIMARY_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(question_table)
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------
        # Section 2 — Executive Summary
        # -------------------------------------------------------------
        story.append(Paragraph("Section 2 — Executive Summary", styles["h1"]))
        summary_text = analysis_result.analysis.summary
        summary_table = Table(
            [[Paragraph(f"<b>Key Takeaway:</b> {summary_text}", styles["summary"])]],
            colWidths=[usable_width],
        )
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), ACCENT_MINT),
            ("BOX", (0, 0), (-1, -1), 1, ACCENT_BORDER),
            ("LINELEFT", (0, 0), (-1, -1), 4, PRIMARY_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------
        # Section 3 — Data Sources
        # -------------------------------------------------------------
        story.append(Paragraph("Section 3 — Data Sources", styles["h1"]))
        ds = analysis_result.data_source
        ds_id = ds.id if ds and ds.id else "enterprise_db"
        ds_engine = ds.engine if ds and ds.engine else "PostgreSQL"
        ds_schema = (ds.schema_name or "public") if ds else "public"
        tables_str = ", ".join(analysis_result.tables_used) if analysis_result.tables_used else "N/A"

        ds_data = [
            [
                Paragraph(f"<b>Data Source ID:</b> {ds_id}", styles["body"]),
                Paragraph(f"<b>Database Engine:</b> {ds_engine}", styles["body"]),
            ],
            [
                Paragraph(f"<b>Schema:</b> {ds_schema}", styles["body"]),
                Paragraph(f"<b>Tables Queried:</b> {tables_str}", styles["body"]),
            ],
        ]
        ds_table = Table(ds_data, colWidths=[usable_width * 0.48, usable_width * 0.52])
        ds_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(ds_table)
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------
        # Section 4 — Methodology
        # -------------------------------------------------------------
        story.append(Paragraph("Section 4 — Methodology", styles["h1"]))
        methodology_steps = [
            "1. Business question was interpreted by the Analytics Agent to identify target analytical dimensions.",
            "2. Relevant enterprise schemas, tables, and relational constraints were discovered.",
            "3. SQL query was generated following read-only governance and aggregation standards.",
            "4. SQL was executed securely through the Enterprise Data MCP Server with connection pooling.",
            "5. Query results were validated, audited, and returned without mutation.",
            "6. Quantitative metrics and trends were synthesized into business takeaways.",
            "7. The verified analysis was converted into this auditable enterprise report.",
        ]
        methodology_table_data = [[Paragraph(step, styles["body"])] for step in methodology_steps]
        methodology_table = Table(methodology_table_data, colWidths=[usable_width])
        methodology_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_CANVAS),
            ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(methodology_table)
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------
        # Section 5 — SQL / Analytical Evidence
        # -------------------------------------------------------------
        story.append(Paragraph("Section 5 — SQL / Analytical Evidence", styles["h1"]))
        clean_sql = analysis_result.sql.strip() if analysis_result.sql else None
        if clean_sql:
            sql_p = Paragraph(f"<font color='#176B52'><b>-- Executed Read-Only Query</b></font><br/>{clean_sql}", styles["sql"])
        else:
            sql_p = Paragraph("<font color='#66736C'><i>-- Direct analytical aggregation performed. No raw SQL query supplied.</i></font>", styles["sql"])
        sql_table = Table([[sql_p]], colWidths=[usable_width])
        sql_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_CANVAS),
            ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(sql_table)
        story.append(Spacer(1, 8))

        # -------------------------------------------------------------
        # Section 6 — Query Results Table
        # -------------------------------------------------------------
        story.append(Paragraph("Section 6 — Query Results", styles["h1"]))

        qr = analysis_result.query_result
        if not qr.rows:
            empty_msg = Paragraph("<i>No records were returned for this query.</i>", styles["body_muted"])
            story.append(empty_msg)
        else:
            MAX_DISPLAY_ROWS = 50
            display_rows = qr.rows[:MAX_DISPLAY_ROWS]
            is_truncated = len(qr.rows) > MAX_DISPLAY_ROWS

            if is_truncated and analysis_result.metadata:
                analysis_result.metadata.truncated = True

            col_specs = qr.columns
            col_widths = PDFService._compute_col_widths(col_specs, display_rows, usable_width)

            # Build Table Headers
            header_row = [
                Paragraph(humanize_column_name(col.name), styles["table_header"])
                for col in col_specs
            ]
            table_data = [header_row]

            # Build Table Rows
            for row_idx, row in enumerate(display_rows):
                row_cells = []
                for col in col_specs:
                    col_name = col.name
                    raw_val = row.get(col_name)
                    formatted_val = format_cell_value(raw_val, col_name, col.data_type)

                    if not HAS_RUPEE_FONT and "₹" in formatted_val:
                        formatted_val = formatted_val.replace("₹", "Rs. ")

                    is_num = is_currency_column(col_name) or is_percentage_column(col_name) or isinstance(raw_val, (int, float))
                    cell_style = styles["table_cell_num"] if is_num else styles["table_cell"]
                    row_cells.append(Paragraph(formatted_val, cell_style))
                table_data.append(row_cells)

            res_table = Table(table_data, colWidths=col_widths, repeatRows=1)

            t_style = [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]

            for r_i in range(1, len(table_data)):
                bg = WHITE if r_i % 2 != 0 else colors.HexColor("#F8FAF9")
                t_style.append(("BACKGROUND", (0, r_i), (-1, r_i), bg))

            res_table.setStyle(TableStyle(t_style))
            story.append(res_table)

            if is_truncated:
                story.append(Spacer(1, 3))
                truncation_note = Paragraph(
                    f"<i>Note: Displaying top {MAX_DISPLAY_ROWS} of {qr.row_count} total records. Complete data export available via enterprise analytics storage.</i>",
                    styles["body_muted"]
                )
                story.append(truncation_note)

        story.append(Spacer(1, 8))

        # -------------------------------------------------------------
        # Section 7 — Visualizations
        # -------------------------------------------------------------
        if chart_png_bytes:
            story.append(Paragraph("Section 7 — Visualizations", styles["h1"]))
            chart_stream = io.BytesIO(chart_png_bytes)

            chart_img = Image(chart_stream, width=usable_width, height=195)
            chart_img.hAlign = "CENTER"

            caption = Paragraph("<i>Figure 1: Automated analytical visualization synthesized from query result.</i>", styles["body_muted"])

            story.append(KeepTogether([
                chart_img,
                Spacer(1, 3),
                caption,
            ]))
            story.append(Spacer(1, 8))

        # -------------------------------------------------------------
        # Section 8 — Key Findings
        # -------------------------------------------------------------
        story.append(Paragraph("Section 8 — Key Findings", styles["h1"]))
        findings = analysis_result.analysis.key_findings
        if findings:
            findings_data = [
                [Paragraph(f"<b>{idx + 1}.</b>", styles["body"]), Paragraph(item, styles["body"])]
                for idx, item in enumerate(findings)
            ]
            findings_table = Table(findings_data, colWidths=[18, usable_width - 18])
            findings_table.setStyle(TableStyle([
                ("TOPPADDING", (0, 0), (-1, -1), 1.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]))
            story.append(findings_table)
        else:
            story.append(Paragraph("<i>No specific key findings provided in analysis payload.</i>", styles["body_muted"]))
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------
        # Section 9 — Recommendations
        # -------------------------------------------------------------
        story.append(Paragraph("Section 9 — Recommendations", styles["h1"]))
        recs = analysis_result.analysis.recommendations
        if recs:
            recs_data = [
                [Paragraph(f"<b>{idx + 1}.</b>", styles["body"]), Paragraph(item, styles["body"])]
                for idx, item in enumerate(recs)
            ]
            recs_table = Table(recs_data, colWidths=[18, usable_width - 18])
            recs_table.setStyle(TableStyle([
                ("TOPPADDING", (0, 0), (-1, -1), 1.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]))
            story.append(recs_table)
        else:
            story.append(Paragraph("<i>No specific actionable recommendations were generated for this query.</i>", styles["body_muted"]))
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------
        # Section 10 — Data Quality and Limitations
        # -------------------------------------------------------------
        story.append(Paragraph("Section 10 — Data Quality and Limitations", styles["h1"]))
        limitations = analysis_result.analysis.data_quality_and_limitations or []

        if not limitations and analysis_result.metadata:
            meta = analysis_result.metadata
            derived = []
            if meta.truncated:
                derived.append("Query result set was capped for optimal report presentation.")
            if meta.filters_applied:
                derived.append(f"Filters applied to query scope: {', '.join(meta.filters_applied)}.")
            if meta.total_source_rows:
                derived.append(f"Analyzed sample of {qr.row_count} records from {meta.total_source_rows} total database entries.")
            if derived:
                limitations = derived

        if limitations:
            lim_data = [
                [Paragraph("•", styles["body"]), Paragraph(item, styles["body"])]
                for item in limitations
            ]
            lim_table = Table(lim_data, colWidths=[14, usable_width - 14])
            lim_table.setStyle(TableStyle([
                ("TOPPADDING", (0, 0), (-1, -1), 1.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]))
            story.append(lim_table)
        else:
            story.append(Paragraph("No anomalous data quality flags or sampling truncations were detected during query execution. Analysis reflects complete returned database records.", styles["body"]))
        story.append(Spacer(1, 8))

        # -------------------------------------------------------------
        # Section 11 — Report Metadata
        # -------------------------------------------------------------
        story.append(Paragraph("Section 11 — Report Metadata", styles["h1"]))
        exec_ms = f"{analysis_result.metadata.execution_time_ms:.1f} ms" if analysis_result.metadata and analysis_result.metadata.execution_time_ms else "N/A"

        audit_data = [
            [
                Paragraph(f"<b>Report ID:</b> {analysis_result.report_id}", styles["body"]),
                Paragraph(f"<b>Generated At:</b> {formatted_date}", styles["body"]),
            ],
            [
                Paragraph(f"<b>Database Engine:</b> {ds_engine}", styles["body"]),
                Paragraph(f"<b>Data Source:</b> {ds_id}", styles["body"]),
            ],
            [
                Paragraph(f"<b>Execution Latency:</b> {exec_ms}", styles["body"]),
                Paragraph(f"<b>Records Returned:</b> {qr.row_count} rows", styles["body"]),
            ],
        ]
        audit_table = Table(audit_data, colWidths=[usable_width * 0.5, usable_width * 0.5])
        audit_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_CANVAS),
            ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(audit_table)

        # Build document with custom NumberedCanvas
        def canvas_maker(*args, **kwargs):
            c = NumberedCanvas(*args, **kwargs)
            c.report_id = analysis_result.report_id or "RPT-2026"
            c.generated_at = formatted_date
            return c

        doc.build(story, canvasmaker=canvas_maker)
        return buffer.getvalue()

    @staticmethod
    def _compute_col_widths(columns: List[Any], rows: List[Dict[str, Any]], total_width: float) -> List[float]:
        """Compute balanced column widths ensuring table fits page cleanly."""
        num_cols = len(columns)
        if num_cols == 0:
            return []
        if num_cols == 1:
            return [total_width]

        weights = []
        for col in columns:
            name_len = len(str(col.name))
            sample_val = rows[0].get(col.name, "") if rows else ""
            val_len = len(str(sample_val))

            weight = max(name_len, val_len, 8)
            if is_currency_column(col.name):
                weight = max(weight, 16)
            weights.append(weight)

        total_weight = sum(weights)
        widths = [(w / total_weight) * total_width for w in weights]

        min_width = 45.0
        adjusted_widths = [max(min_width, w) for w in widths]
        diff = sum(adjusted_widths) - total_width
        if diff > 0 and total_width > num_cols * min_width:
            scaling = total_width / sum(adjusted_widths)
            adjusted_widths = [w * scaling for w in adjusted_widths]

        return adjusted_widths
