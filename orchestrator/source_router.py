"""Schema-aware source routing for single- and multi-database questions."""

import re
from typing import Dict, Iterable, List


SOURCE_TERMS = {
    "ecommerce_db": (
        "e-commerce", "ecommerce", "online order", "purchase value", "product category",
        "order item", "shopping", "cart", "completed order",
    ),
    "hrms_db": (
        "hr", "human resources", "attendance", "payroll", "salary", "leave",
        "department", "designation", "performance review", "training", "skill",
    ),
    "crm_db": (
        "crm", "lead", "opportunity", "sales representative", "salesperson",
        "sales person", "sales performance", "sales pipeline", "quote", "ticket",
        "customer contact",
    ),
    "erp_db": (
        "erp", "inventory", "warehouse", "supplier", "purchase order", "sales order",
        "invoice", "shipment", "expense", "stock level",
    ),
}

TABLE_HINTS = {
    "employee": ("employees", "sales_representatives"),
    "customer": ("customers", "customer_contacts"),
    "product": ("products",),
    "order": ("orders", "sales_orders", "purchase_orders"),
    "payment": ("payments",),
}

MULTI_SOURCE_TERMS = (
    "across databases", "across systems", "combine", "combined", "correlate",
    "relationship between", "compare with", "compare against", "integrate",
)


class SourceRouter:
    """Choose relevant MCP sources without coupling routing to agent business logic."""

    def select(self, question: str, source_tables: Dict[str, Iterable[str]]) -> List[str]:
        text = re.sub(r"\s+", " ", (question or "").lower()).strip()
        scores = {source: 0 for source in source_tables}

        for source, terms in SOURCE_TERMS.items():
            if source in scores:
                scores[source] += sum(4 for term in terms if term in text)

        for word, tables in TABLE_HINTS.items():
            if re.search(rf"\b{re.escape(word)}s?\b", text):
                for source, available in source_tables.items():
                    available_lower = {str(table).lower() for table in available}
                    scores[source] += sum(1 for table in tables if table in available_lower)

        # In business language, employee + sales performance normally means a CRM
        # sales representative, not a generic HR performance review.
        if "crm_db" in scores and re.search(r"\b(employee|employees)\b", text) and "sales" in text:
            scores["crm_db"] += 8

        ranked = sorted(scores, key=lambda source: (-scores[source], source))
        positive = [source for source in ranked if scores[source] > 0]
        if not positive:
            return ["ecommerce_db"] if "ecommerce_db" in scores else ranked[:1]

        wants_multiple = any(term in text for term in MULTI_SOURCE_TERMS)
        if wants_multiple:
            strong = [source for source in positive if scores[source] >= 4]
            return strong[:4] if len(strong) > 1 else positive[:2]
        return positive[:1]

