"""
ReportLab Template, Stylesheet, and NumberedCanvas for Enterprise Analytics Reports.
Provides running headers, "Page X of Y" footers, font registration, and color palette.
"""

import os
from typing import Tuple
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Enterprise Color Palette
PRIMARY_COLOR = colors.HexColor("#176B52")      # Dark Emerald
PRIMARY_HOVER = colors.HexColor("#125641")      # Deep Forest
ACCENT_MINT = colors.HexColor("#E3F2EC")        # Soft Mint Background
ACCENT_BORDER = colors.HexColor("#BCE3D3")      # Mint Border
TEXT_PRIMARY = colors.HexColor("#18221E")       # Ink
TEXT_SECONDARY = colors.HexColor("#66736C")     # Muted Slate
BG_CANVAS = colors.HexColor("#F4F7F5")          # Neutral Light
BORDER_COLOR = colors.HexColor("#DDE6E1")       # Subtle Border
SUCCESS_GREEN = colors.HexColor("#3E9B68")      # Positive Delta
WARNING_AMBER = colors.HexColor("#D69A3A")      # Warning Accent
WHITE = colors.HexColor("#FFFFFF")

# Font Registration with Multi-Platform Fallback
FONT_FAMILY = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"
FONT_CODE = "Courier"
HAS_RUPEE_FONT = False

def _init_fonts():
    global FONT_FAMILY, FONT_BOLD, FONT_ITALIC, FONT_CODE, HAS_RUPEE_FONT

    windows_fonts = "C:/Windows/Fonts"
    candidates = [
        # (FamilyName, RegularPath, BoldPath, ItalicPath)
        ("SegoeUI", os.path.join(windows_fonts, "segoeui.ttf"), os.path.join(windows_fonts, "segoeuib.ttf"), os.path.join(windows_fonts, "segoeuii.ttf")),
        ("Arial", os.path.join(windows_fonts, "arial.ttf"), os.path.join(windows_fonts, "arialbd.ttf"), os.path.join(windows_fonts, "ariali.ttf")),
        ("Calibri", os.path.join(windows_fonts, "calibri.ttf"), os.path.join(windows_fonts, "calibrib.ttf"), os.path.join(windows_fonts, "calibrii.ttf")),
        # Linux paths
        ("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"),
    ]

    for fam, reg, bold, italic in candidates:
        if os.path.exists(reg) and os.path.exists(bold):
            try:
                pdfmetrics.registerFont(TTFont(fam, reg))
                pdfmetrics.registerFont(TTFont(f"{fam}-Bold", bold))
                if os.path.exists(italic):
                    pdfmetrics.registerFont(TTFont(f"{fam}-Italic", italic))
                else:
                    pdfmetrics.registerFont(TTFont(f"{fam}-Italic", reg))

                FONT_FAMILY = fam
                FONT_BOLD = f"{fam}-Bold"
                FONT_ITALIC = f"{fam}-Italic"
                HAS_RUPEE_FONT = True
                break
            except Exception as e:
                continue

    # Code font
    consolas = os.path.join(windows_fonts, "consola.ttf")
    if os.path.exists(consolas):
        try:
            pdfmetrics.registerFont(TTFont("Consolas", consolas))
            FONT_CODE = "Consolas"
        except Exception:
            FONT_CODE = "Courier"

_init_fonts()


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw total pages ('Page X of Y')
    along with running header and running footer on every page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.report_id = "RPT-2026"
        self.generated_at = ""

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        page_w, page_h = self._pagesize

        # Running Header (on page > 1)
        if self._pageNumber > 1:
            self.saveState()
            self.setFont(FONT_FAMILY, 7.5)
            self.setFillColor(TEXT_SECONDARY)
            self.drawString(45, page_h - 32, "Enterprise Analytics Report  ·  AGENTVERSE")
            if self.report_id:
                self.drawRightString(page_w - 45, page_h - 32, f"ID: {self.report_id}")

            # Top thin rule
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(45, page_h - 38, page_w - 45, page_h - 38)
            self.restoreState()

        # Running Footer (on all pages)
        self.saveState()
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(45, 40, page_w - 45, 40)

        self.setFont(FONT_FAMILY, 7.5)
        self.setFillColor(TEXT_SECONDARY)
        self.drawString(45, 28, "Confidential  ·  Enterprise Analytics System")

        if self.generated_at:
            self.drawCentredString(page_w / 2, 28, f"Generated: {self.generated_at}")

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(page_w - 45, 28, page_str)
        self.restoreState()


def get_report_styles():
    """Create a coherent, publication-grade typography hierarchy."""
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=20,
        leading=24,
        textColor=TEXT_PRIMARY,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName=FONT_FAMILY,
        fontSize=8.5,
        leading=12,
        textColor=TEXT_SECONDARY,
        spaceAfter=12,
    )

    h1_style = ParagraphStyle(
        "ReportH1",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=16,
        textColor=PRIMARY_COLOR,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "ReportH2",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=9.5,
        leading=13,
        textColor=TEXT_PRIMARY,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName=FONT_FAMILY,
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_PRIMARY,
        spaceAfter=5,
    )

    body_muted = ParagraphStyle(
        "ReportBodyMuted",
        parent=styles["Normal"],
        fontName=FONT_FAMILY,
        fontSize=8,
        leading=11.5,
        textColor=TEXT_SECONDARY,
    )

    question_style = ParagraphStyle(
        "QuestionText",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=16,
        textColor=TEXT_PRIMARY,
    )

    summary_style = ParagraphStyle(
        "ExecutiveSummaryText",
        parent=styles["Normal"],
        fontName=FONT_FAMILY,
        fontSize=9.5,
        leading=14,
        textColor=TEXT_PRIMARY,
    )

    sql_code_style = ParagraphStyle(
        "SQLCode",
        parent=styles["Normal"],
        fontName=FONT_CODE,
        fontSize=7.5,
        leading=10.5,
        textColor=TEXT_PRIMARY,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=8,
        leading=10,
        textColor=WHITE,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName=FONT_FAMILY,
        fontSize=7.5,
        leading=10,
        textColor=TEXT_PRIMARY,
    )

    table_cell_num = ParagraphStyle(
        "TableCellNumeric",
        parent=styles["Normal"],
        fontName=FONT_FAMILY,
        fontSize=7.5,
        leading=10,
        textColor=TEXT_PRIMARY,
        alignment=2,  # Right aligned
    )

    return {
        "title": title_style,
        "subtitle": subtitle_style,
        "h1": h1_style,
        "h2": h2_style,
        "body": body_style,
        "body_muted": body_muted,
        "question": question_style,
        "summary": summary_style,
        "sql": sql_code_style,
        "table_header": table_header_style,
        "table_cell": table_cell_style,
        "table_cell_num": table_cell_num,
    }
