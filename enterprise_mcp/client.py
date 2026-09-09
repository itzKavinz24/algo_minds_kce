"""Application-independent enterprise MCP interface.

The mock implementation is intentionally replaceable by Mithulesh's real MCP client.
The orchestrator only relies on this contract.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from models.mock_data import (
    MOCK_DECLINING_SALES_SCENARIO,
    MOCK_EMPLOYEE_DISTRIBUTION,
    MOCK_MONTHLY_REVENUE_TREND,
    MOCK_REVENUE_BY_CATEGORY,
    MOCK_SINGLE_KPI_THIS_MONTH,
)
from models.mock_schema import ECOMMERCE_SCHEMA, HRMS_SCHEMA
from models.schemas import DatabaseSchema


class EnterpriseMCPClient(ABC):
    @abstractmethod
    def list_sources(self) -> List[str]: ...

    @abstractmethod
    def get_schema(self, source: str) -> DatabaseSchema: ...

    @abstractmethod
    def execute_read_query(self, source: str, sql: str) -> List[Dict[str, Any]]: ...

    def list_tables(self, source: str) -> List[str]:
        return list(self.get_schema(source).tables)

    def describe_table(self, source: str, table: str) -> Dict[str, Any]:
        schema = self.get_schema(source)
        if table not in schema.tables:
            raise KeyError(f"Unknown table '{table}' for source '{source}'.")
        return schema.tables[table].to_dict()

    def get_relationships(self, source: str) -> List[Dict[str, Any]]:
        return [relationship.to_dict() for relationship in self.get_schema(source).relationships]


class MockEnterpriseMCPClient(EnterpriseMCPClient):
    """Offline adapter that proves the MCP boundary before a live server is connected."""

    SOURCES = {
        "ecommerce_db": ECOMMERCE_SCHEMA,
        "hrms_db": HRMS_SCHEMA,
    }

    def list_sources(self) -> List[str]:
        return list(self.SOURCES)

    def get_schema(self, source: str) -> DatabaseSchema:
        try:
            return self.SOURCES[source]
        except KeyError as exc:
            raise ValueError(f"Unknown enterprise source: {source}") from exc

    def execute_read_query(self, source: str, sql: str) -> List[Dict[str, Any]]:
        text = sql.lower()
        if source == "hrms_db":
            return list(MOCK_EMPLOYEE_DISTRIBUTION)
        if "category" in text or "products" in text:
            return list(MOCK_REVENUE_BY_CATEGORY)
        if "date_trunc" in text or "group by 1" in text:
            if "2 month" in text or "last_month" in text:
                return list(MOCK_DECLINING_SALES_SCENARIO)
            return list(MOCK_MONTHLY_REVENUE_TREND)
        if "sum(" in text and "group by" not in text:
            return list(MOCK_SINGLE_KPI_THIS_MONTH)
        return list(MOCK_MONTHLY_REVENUE_TREND)
