"""Centralized Groq LLM Client implementation."""

import os
from typing import Any, Dict, List, Optional, Union
from dotenv import load_dotenv

try:
    from groq import Groq, GroqError
except ImportError:
    Groq = None
    GroqError = Exception

from llm.base import BaseLLMClient

# Load environment variables from .env file
load_dotenv()

DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


class GroqClient(BaseLLMClient):
    """Reusable centralized Groq client implementing the BaseLLMClient interface."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
    ) -> None:
        """Initialize the Groq client.

        Args:
            api_key: Groq API key. If not provided, reads from GROQ_API_KEY env var.
            default_model: Default model to use. Defaults to GROQ_MODEL env var or 'openai/gpt-oss-120b'.

        Raises:
            ImportError: If the 'groq' package is not installed.
            ValueError: If GROQ_API_KEY is not configured or is a placeholder.
        """
        if Groq is None:
            raise ImportError(
                "The 'groq' library is not installed. Please install dependencies: pip install -r requirements.txt"
            )

        if api_key is not None:
            self.api_key = api_key
        else:
            self.api_key = os.getenv("GROQ_API_KEY")

        if not self.api_key or self.api_key.strip() == "" or self.api_key == "your_api_key_here":
            raise ValueError(
                "GROQ_API_KEY is not configured. Please set a valid GROQ_API_KEY in your .env file."
            )

        self.default_model = default_model or os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
        self.client = Groq(api_key=self.api_key)

    def generate(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        """Generate a chat completion response from Groq.

        Args:
            messages: List of message dictionaries with 'role' and 'content'.
            model: Model identifier (defaults to self.default_model).
            temperature: Sampling temperature (default: 0.0 for deterministic output).
            max_tokens: Optional maximum tokens limit.
            **kwargs: Extra parameters passed to the Groq API.

        Returns:
            The text response from the model.

        Raises:
            RuntimeError: If the Groq API call fails.
        """
        target_model = model or self.default_model

        try:
            params: Dict[str, Any] = {
                "model": target_model,
                "messages": messages,
                "temperature": temperature,
                **kwargs,
            }
            if max_tokens is not None:
                params["max_tokens"] = max_tokens

            response = self.client.chat.completions.create(**params)
            return response.choices[0].message.content or ""

        except GroqError as e:
            raise RuntimeError(f"Groq API error during generation: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Unexpected error communicating with Groq: {e}") from e

    def generate_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> str:
        """Convenience helper to generate from system and user prompt strings.

        Args:
            system_prompt: The system instruction prompt.
            user_prompt: The user question or payload prompt.
            temperature: Sampling temperature (default 0.0).
            model: Optional model identifier.
            **kwargs: Additional parameters.

        Returns:
            The assistant text response.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return self.generate(messages=messages, model=model, temperature=temperature, **kwargs)

    def test_connection(self) -> bool:
        """Quick connectivity check to verify API key validity and network connection.

        Returns:
            True if the connection succeeded, raises an exception otherwise.
        """
        test_messages = [{"role": "user", "content": "Respond with 'OK' if you can read this."}]
        response = self.generate(messages=test_messages, max_tokens=10)
        return bool(response.strip())


# Global singleton client cache
_central_client: Optional[GroqClient] = None


def get_groq_client(force_new: bool = False) -> GroqClient:
    """Get or create the centralized GroqClient instance."""
    global _central_client
    if _central_client is None or force_new:
        _central_client = GroqClient()
    return _central_client


def generate(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.0,
    model: Optional[str] = None,
) -> str:
    """Convenience module-level generation function using the centralized Groq client.

    Args:
        system_prompt: System instructions.
        user_prompt: User question or message.
        temperature: Sampling temperature (default: 0.0).
        model: Optional model override.

    Returns:
        The generated text response.
    """
    client = get_groq_client()
    return client.generate_prompt(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=temperature,
        model=model,
    )
