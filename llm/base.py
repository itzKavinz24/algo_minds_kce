"""Base LLM Client interface for LLM provider abstraction."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseLLMClient(ABC):
    """Abstract base class for all LLM client implementations.

    This ensures that the agent layer is decoupled from specific LLM providers
    (e.g., Groq, OpenAI, Anthropic) and can switch providers seamlessly.
    """

    @abstractmethod
    def generate(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        """Generate a response from the LLM given a list of chat messages.

        Args:
            messages: List of message dicts (e.g. [{"role": "user", "content": "..."}]).
            model: Model identifier. If None, the provider's default model is used.
            temperature: Sampling temperature (0.0 = deterministic, higher = more creative).
            max_tokens: Maximum number of tokens to generate.
            **kwargs: Provider-specific additional parameters.

        Returns:
            The text response from the model.
        """
        pass
