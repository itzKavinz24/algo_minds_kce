"""SQL Agent implementation for AgentVerse Agent Layer."""

import json
import logging
import re
from typing import Any, Dict, Optional, Union

from llm.base import BaseLLMClient
from llm.groq_client import GroqClient
from models.schemas import DatabaseSchema, IntentOutput, SQLOutput
from prompts.sql import build_sql_prompt

logger = logging.getLogger(__name__)

DISALLOWED_SQL_KEYWORDS = (
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
    "EXEC",
    "EXECUTE",
)


class SQLAgent:
    """Agent responsible for translating structured intent and schema metadata into read-only SQL queries."""

    def __init__(
        self,
        llm_client: Optional[BaseLLMClient] = None,
        model: Optional[str] = None,
    ) -> None:
        """Initialize the SQL Agent.

        Args:
            llm_client: LLM client adhering to BaseLLMClient (defaults to GroqClient).
            model: Optional model override.
        """
        self.llm_client = llm_client or GroqClient()
        self.model = model

    def generate_sql(
        self,
        question: str,
        intent: Union[IntentOutput, Dict[str, Any]],
        schema: Union[DatabaseSchema, Dict[str, Any]],
        context: Optional[str] = None,
    ) -> SQLOutput:
        """Generate a read-only SQL query matching user intent and database schema.

        Args:
            question: Original natural language question.
            intent: Structured intent from IntentAgent (IntentOutput object or dict).
            schema: Database schema metadata (DatabaseSchema object or dict).
            context: Optional conversational or analytical context.

        Returns:
            Structured SQLOutput containing generated SQL, tables_used, and explanation.

        Raises:
            ValueError: If input validation fails or output cannot be parsed.
            RuntimeError: If LLM invocation fails or returns a destructive/empty query.
        """
        # 1. Validate inputs
        if not question or not question.strip():
            raise ValueError("User question cannot be empty.")

        if isinstance(intent, dict):
            if not intent:
                raise ValueError("Intent cannot be empty.")
            intent_obj = IntentOutput.from_dict(intent, raw_query=question.strip())
        elif isinstance(intent, IntentOutput):
            intent_obj = intent
        else:
            raise ValueError("Intent must be an IntentOutput instance or dictionary.")

        if isinstance(schema, dict):
            if not schema or not schema.get("tables"):
                raise ValueError("Database schema must contain at least one table definition.")
            schema_obj = DatabaseSchema.from_dict(schema)
        elif isinstance(schema, DatabaseSchema):
            if not schema.tables:
                raise ValueError("Database schema must contain at least one table definition.")
            schema_obj = schema
        else:
            raise ValueError("Schema must be a DatabaseSchema instance or dictionary.")

        # 2. Build prompt
        schema_text = schema_obj.format_for_prompt()
        messages = build_sql_prompt(
            question=question.strip(),
            intent_dict=intent_obj.to_dict(),
            schema_text=schema_text,
            context=context,
        )

        # 3. Call LLM
        raw_response = self.llm_client.generate(
            messages=messages,
            model=self.model,
            temperature=0.0,  # Strict deterministic generation
        )

        # 4. Clean and parse JSON response
        parsed_data = self._clean_and_parse_json(raw_response)
        sql_output = SQLOutput.from_dict(parsed_data)

        # 5. Sanity check generated query
        self._validate_generated_sql(sql_output, schema_obj)

        return sql_output

    def _clean_and_parse_json(self, response_text: str) -> Dict[str, Any]:
        """Extract and parse JSON object from LLM output."""
        text = response_text.strip()

        # Remove markdown fences if present
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
            text = re.sub(r"\s*```$", "", text)
            text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Extract JSON substring
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
                    raise ValueError(f"Malformed JSON from LLM: {e}. Raw response: {response_text}") from e

        raise ValueError(f"No valid JSON found in LLM response: '{response_text}'")

    def _validate_generated_sql(self, sql_output: SQLOutput, schema: DatabaseSchema) -> None:
        """Perform basic pre-flight verification on generated SQL output."""
        query = sql_output.sql.strip()

        if not query:
            raise ValueError("LLM generated an empty SQL query.")

        # Remove leading comments or CTEs for first-word check
        cleaned_query = re.sub(r"--[^\n]*", "", query).strip()
        cleaned_query = re.sub(r"/\*[\s\S]*?\*/", "", cleaned_query).strip()

        first_word = cleaned_query.split()[0].upper() if cleaned_query.split() else ""
        if first_word not in ("SELECT", "WITH", "EXPLAIN"):
            raise ValueError(
                f"Generated query must be a read-only SELECT statement. Found query starting with '{first_word}'."
            )

        # Check for disallowed mutation keywords in non-subquery context
        tokens = re.findall(r"\b[A-Z]+\b", query.upper())
        for keyword in DISALLOWED_SQL_KEYWORDS:
            if keyword in tokens:
                raise ValueError(
                    f"Disallowed mutation keyword '{keyword}' detected in generated query. Query must be strictly read-only."
                )

        # Cross-check tables used against schema if specified
        valid_tables = set(k.lower() for k in schema.tables.keys())
        for table in sql_output.tables_used:
            if table.lower() not in valid_tables:
                logger.warning(f"Table '{table}' mentioned in tables_used is not in supplied schema: {valid_tables}")
