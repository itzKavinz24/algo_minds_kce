"""Intent Agent implementation for AgentVerse Agent Layer."""

import json
import logging
import re
from typing import Any, Dict, Optional

from llm.base import BaseLLMClient
from llm.groq_client import GroqClient
from models.schemas import IntentOutput
from prompts.intent import build_intent_prompt

logger = logging.getLogger(__name__)


class IntentAgent:
    """Agent responsible for classifying and extracting structured intent from natural language questions."""

    def __init__(
        self,
        llm_client: Optional[BaseLLMClient] = None,
        model: Optional[str] = None,
    ) -> None:
        """Initialize the Intent Agent.

        Args:
            llm_client: LLM client instance adhering to BaseLLMClient (defaults to GroqClient).
            model: Optional model identifier override.
        """
        self.llm_client = llm_client or GroqClient()
        self.model = model

    def parse_intent(self, user_query: str, context: Optional[str] = None) -> IntentOutput:
        """Parse a natural language query into a structured IntentOutput.

        Args:
            user_query: The natural language question (e.g. 'Show revenue by category.').
            context: Optional contextual notes or conversation history.

        Returns:
            Structured IntentOutput object.

        Raises:
            ValueError: If user_query is empty or LLM response cannot be parsed into a valid intent.
        """
        if not user_query or not user_query.strip():
            raise ValueError("user_query cannot be empty.")

        messages = build_intent_prompt(query=user_query.strip(), context=context)

        raw_response = self.llm_client.generate(
            messages=messages,
            model=self.model,
            temperature=0.0,  # Deterministic output for structured extraction
        )

        parsed_data = self._clean_and_parse_json(raw_response)
        intent = IntentOutput.from_dict(parsed_data, raw_query=user_query.strip())
        return intent

    def _clean_and_parse_json(self, response_text: str) -> Dict[str, Any]:
        """Sanitize and parse raw LLM response text into a dictionary.

        Handles markdown code block wrapping (```json ... ```), trailing commas,
        and surrounding conversational text.

        Args:
            response_text: The raw string returned by the LLM.

        Returns:
            Parsed dictionary from JSON.

        Raises:
            ValueError: If valid JSON cannot be extracted.
        """
        text = response_text.strip()

        # 1. Remove markdown code fences if present
        if text.startswith("```"):
            # Strip opening fence (e.g., ```json or ```)
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
            # Strip closing fence
            text = re.sub(r"\s*```$", "", text)
            text = text.strip()

        # 2. Direct JSON parse attempt
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 3. Extract JSON object substring between outer brackets '{' and '}'
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            json_str = match.group(0)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                # Attempt to fix common LLM JSON syntax errors (trailing commas)
                fixed_json = re.sub(r",\s*([\]}])", r"\1", json_str)
                try:
                    return json.loads(fixed_json)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse cleaned JSON substring: {fixed_json}")
                    raise ValueError(f"Malformed JSON from LLM: {e}. Raw response: {response_text}") from e

        raise ValueError(f"No valid JSON found in LLM response. Raw output: '{response_text}'")
