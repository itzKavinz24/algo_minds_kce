"""Unit and integration tests for the centralized Groq LLM client."""

import os
import sys
import unittest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from llm.groq_client import GroqClient, generate, get_groq_client


class TestGroqClientOffline(unittest.TestCase):
    """Offline unit tests for GroqClient configuration and validation."""

    def setUp(self):
        try:
            import groq
        except ImportError:
            raise unittest.SkipTest("The 'groq' library is not installed in current env.")

    def test_missing_api_key_raises_value_error(self):
        # Explicit empty string / None / placeholder should raise ValueError
        with self.assertRaises(ValueError) as ctx:
            GroqClient(api_key="")
        self.assertIn("GROQ_API_KEY", str(ctx.exception))

    def test_placeholder_api_key_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            GroqClient(api_key="your_api_key_here")
        self.assertIn("GROQ_API_KEY", str(ctx.exception))

    def test_client_initialization_with_custom_key_and_model(self):
        # We test that initialization sets properties without calling network
        client = GroqClient(api_key="gsk_test_mock_key_12345", default_model="llama-3.3-70b-versatile")
        self.assertEqual(client.default_model, "llama-3.3-70b-versatile")
        self.assertEqual(client.api_key, "gsk_test_mock_key_12345")


class TestGroqClientLive(unittest.TestCase):
    """Live connectivity test with real Groq API (skipped if GROQ_API_KEY is not configured)."""

    def setUp(self):
        key = os.getenv("GROQ_API_KEY", "")
        if not key or key == "your_api_key_here" or not key.startswith("gsk_"):
            raise unittest.SkipTest("GROQ_API_KEY is not configured in environment. Skipping live Groq test.")

    def test_live_groq_generate(self):
        response = generate(
            system_prompt="You are a test assistant. Answer in 2 words.",
            user_prompt="Say 'Connection OK'.",
            temperature=0.0,
        )
        self.assertIsInstance(response, str)
        self.assertTrue(len(response.strip()) > 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
