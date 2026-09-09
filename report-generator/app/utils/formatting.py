"""
Formatting utilities for numbers, currencies, dates, and column headers.
Specialized for Enterprise Analytics reports with Indian currency formatting.
"""

from typing import Any, Union
import re
from datetime import datetime


def format_indian_number(value: Union[int, float, str], decimals: int = 2) -> str:
    """
    Format a number using the Indian numbering system (Lakhs, Crores):
    e.g. 2039938 -> "20,39,938.00", 475275 -> "4,75,275.00"
    """
    if value is None or value == "":
        return "-"

    try:
        num = float(value)
    except (ValueError, TypeError):
        return str(value)

    is_negative = num < 0
    num = abs(num)

    # Format with requested decimals
    fmt_str = f"{num:.{decimals}f}"
    parts = fmt_str.split(".")
    integer_part = parts[0]
    decimal_part = f".{parts[1]}" if len(parts) > 1 and decimals > 0 else ""

    # Grouping logic for Indian numbering: last 3 digits, then groups of 2
    if len(integer_part) <= 3:
        formatted_int = integer_part
    else:
        last3 = integer_part[-3:]
        rest = integer_part[:-3]
        groups = []
        while len(rest) > 2:
            groups.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.append(rest)
        groups.reverse()
        formatted_int = ",".join(groups) + "," + last3

    result = f"{formatted_int}{decimal_part}"
    return f"-{result}" if is_negative else result


def format_currency(value: Any, symbol: str = "₹", decimals: int = 2) -> str:
    """Format value as currency using Indian notation."""
    if value is None or value == "":
        return "-"
    formatted = format_indian_number(value, decimals=decimals)
    if formatted.startswith("-"):
        return f"-{symbol}{formatted[1:]}"
    return f"{symbol}{formatted}"


def format_percentage(value: Any, decimals: int = 1) -> str:
    """Format decimal or integer value as percentage."""
    if value is None:
        return "-"
    try:
        num = float(value)
        # If between 0 and 1 (non-zero), assume decimal fraction
        if 0 < abs(num) <= 1.0 and not isinstance(value, int):
            num = num * 100
        return f"{num:.{decimals}f}%"
    except (ValueError, TypeError):
        return str(value)


def humanize_column_name(col_name: str) -> str:
    """Convert snake_case or technical column names to readable titles."""
    if not col_name:
        return ""
    cleaned = col_name.replace("_", " ").strip()
    words = cleaned.split()
    capitalized = []
    acronyms = {"id", "sql", "mcp", "db", "kpi", "hrms", "crm", "erp", "usd", "inr", "pct"}
    for w in words:
        if w.lower() in acronyms:
            capitalized.append(w.upper())
        else:
            capitalized.append(w.capitalize())
    return " ".join(capitalized)


def is_currency_column(col_name: str) -> bool:
    """Detect if column represents financial/currency metrics."""
    lower = col_name.lower()
    keywords = ["revenue", "sales", "amount", "price", "cost", "budget", "spend", "salary", "earnings", "gross", "margin", "total"]
    return any(k in lower for k in keywords) and "count" not in lower and "pct" not in lower and "percentage" not in lower and "rate" not in lower


def is_percentage_column(col_name: str) -> bool:
    """Detect if column represents percentage / share metrics."""
    lower = col_name.lower()
    return "pct" in lower or "percent" in lower or "share" in lower or "ratio" in lower or "rate" in lower


def format_cell_value(val: Any, col_name: str = "", data_type: str = "") -> str:
    """
    Format a table cell value based on column name, data type, and value inspection.
    """
    if val is None or val == "":
        return "-"

    # If already string, check if it's an ISO date
    if isinstance(val, str):
        if re.match(r"^\d{4}-\d{2}-\d{2}", val):
            try:
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                return dt.strftime("%d %b %Y")
            except Exception:
                return val
        return val

    # Boolean
    if isinstance(val, bool):
        return "Yes" if val else "No"

    # Numeric formatting
    if isinstance(val, (int, float)):
        if is_currency_column(col_name):
            return format_currency(val, symbol="₹", decimals=2 if isinstance(val, float) or val % 1 != 0 else 0)
        elif is_percentage_column(col_name):
            return format_percentage(val, decimals=1)
        elif isinstance(val, int):
            return format_indian_number(val, decimals=0)
        else:
            return format_indian_number(val, decimals=2)

    return str(val)
