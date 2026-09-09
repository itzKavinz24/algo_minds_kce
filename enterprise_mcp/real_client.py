"""Remote Streamable HTTP MCP client for enterprise data tools."""

import asyncio
import json
import os
from typing import Any, Dict, List

from models.schemas import DatabaseSchema, Relationship, TableMetadata


class RealEnterpriseMCPClient:
    def __init__(self, server_url: str = "") -> None:
        self.server_url = (server_url or os.getenv("MCP_SERVER_URL", "")).strip()
        if not self.server_url:
            raise ValueError("MCP_SERVER_URL is required when MCP_MODE=real.")
        if not self.server_url.startswith(("http://", "https://")):
            raise ValueError("MCP_SERVER_URL must start with http:// or https://.")

    def list_sources(self) -> List[str]:
        payload = self._call_tool("list_sources", {})
        values = payload.get("sources", payload) if isinstance(payload, dict) else payload
        if not isinstance(values, list):
            raise ValueError("MCP list_sources returned an invalid response.")
        return [self._item_name(item, "id", "name", "source") for item in values]

    def list_tables(self, source: str) -> List[str]:
        payload = self._call_tool("list_tables", {"source": source})
        values = payload.get("tables", payload) if isinstance(payload, dict) else payload
        if not isinstance(values, list):
            raise ValueError("MCP list_tables returned an invalid response.")
        return [self._item_name(item, "name", "table", "id") for item in values]

    def describe_table(self, source: str, table: str) -> Dict[str, Any]:
        payload = self._call_tool("describe_table", {"source": source, "table": table})
        if isinstance(payload, dict) and isinstance(payload.get("table"), dict):
            payload = payload["table"]
        if not isinstance(payload, dict):
            raise ValueError("MCP describe_table returned an invalid response.")
        return payload

    def get_relationships(self, source: str) -> List[Dict[str, Any]]:
        payload = self._call_tool("get_relationships", {"source": source})
        values = payload.get("relationships", payload) if isinstance(payload, dict) else payload
        if not isinstance(values, list):
            raise ValueError("MCP get_relationships returned an invalid response.")
        return values

    def get_schema(self, source: str) -> DatabaseSchema:
        tables: Dict[str, TableMetadata] = {}
        for table_name in self.list_tables(source):
            metadata = self.describe_table(source, table_name)
            columns = [
                str(column.get("name", "")) if isinstance(column, dict) else str(column)
                for column in metadata.get("columns", [])
            ]
            tables[table_name] = TableMetadata(
                name=table_name,
                columns=[column for column in columns if column],
                description=metadata.get("description"),
                primary_key=metadata.get("primary_key", metadata.get("primaryKey")),
            )

        relationships = []
        for item in self.get_relationships(source):
            if isinstance(item, dict):
                relationships.append(Relationship(
                    from_table=str(item.get("from_table", item.get("fromTable", ""))),
                    from_column=str(item.get("from_column", item.get("fromColumn", ""))),
                    to_table=str(item.get("to_table", item.get("toTable", ""))),
                    to_column=str(item.get("to_column", item.get("toColumn", ""))),
                    relationship_type=str(item.get("relationship_type", item.get("relationshipType", "foreign_key"))),
                ))
        return DatabaseSchema(tables=tables, relationships=relationships)

    def execute_read_query(self, source: str, sql: str) -> List[Dict[str, Any]]:
        payload = self._call_tool("execute_read_query", {"source": source, "sql": sql})
        if isinstance(payload, dict) and isinstance(payload.get("result"), dict):
            payload = payload["result"]
        rows = payload.get("rows", payload.get("data", payload)) if isinstance(payload, dict) else payload
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise ValueError("MCP execute_read_query returned an invalid row response.")
        return rows

    def _call_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        return asyncio.run(self._call_tool_async(name, arguments))

    async def _call_tool_async(self, name: str, arguments: Dict[str, Any]) -> Any:
        try:
            from fastmcp import Client
        except ImportError as exc:
            raise RuntimeError("Install project requirements to use the real MCP client.") from exc
        async with Client(self.server_url) as client:
            result = await client.call_tool(name, arguments)
        return self._decode_result(result)

    @staticmethod
    def _decode_result(result: Any) -> Any:
        for attribute in ("data", "structured_content", "structuredContent"):
            value = getattr(result, attribute, None)
            if value is not None:
                return value
        text = getattr(result, "text", None)
        if text is None:
            text = "\n".join(
                value for content in (getattr(result, "content", []) or [])
                if (value := getattr(content, "text", None))
            )
        if not text:
            raise ValueError("MCP tool returned no readable content.")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text

    @staticmethod
    def _item_name(item: Any, *keys: str) -> str:
        if isinstance(item, str):
            return item
        if isinstance(item, dict):
            for key in keys:
                if item.get(key):
                    return str(item[key])
        raise ValueError("MCP metadata item has no usable identifier.")
