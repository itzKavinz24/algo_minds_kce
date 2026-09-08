"""
Groq Whisper Speech-to-Text Service for AGENTVERSE.
Uses the official Groq Python SDK to transcribe audio using Whisper Large models:
- Primary: whisper-large-v3-turbo
- Fallback: whisper-large-v3
"""

import os
import io
import logging
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq, GroqError

# Load environment variables from backend/.env
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

logger = logging.getLogger("groq_whisper_service")

PRIMARY_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")
FALLBACK_MODEL = "whisper-large-v3"

class GroqWhisperService:
    _instance: Optional["GroqWhisperService"] = None

    def __init__(self, api_key: Optional[str] = None):
        key = api_key or os.getenv("GROQ_API_KEY")
        if not key or not key.strip():
            logger.error("GROQ_API_KEY environment variable is missing or empty.")
            raise ValueError(
                "GROQ_API_KEY is not configured. Please set GROQ_API_KEY in backend/.env"
            )

        self.client = Groq(api_key=key.strip())
        self.primary_model = PRIMARY_MODEL
        self.fallback_model = FALLBACK_MODEL
        logger.info(f"Groq Whisper Service initialized (Primary: {self.primary_model}, Fallback: {self.fallback_model}).")

    @classmethod
    def get_instance(cls) -> "GroqWhisperService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def transcribe(self, file_bytes: bytes, filename: str = "audio.webm") -> str:
        """
        Transcribe audio bytes using Groq Whisper.
        Accepts browser-produced WebM/Opus, WAV, MP3, OGG, M4A, etc.
        """
        if not file_bytes or len(file_bytes) == 0:
            raise ValueError("Audio data is empty.")

        # Ensure filename has an appropriate extension recognizable by Groq
        safe_name = filename if "." in filename else f"{filename}.webm"
        file_tuple = (safe_name, file_bytes)

        # 1. Try with primary model (whisper-large-v3-turbo)
        try:
            transcription = self.client.audio.transcriptions.create(
                file=file_tuple,
                model=self.primary_model,
                response_format="json",
                language="en",
                temperature=0.0
            )
            text = getattr(transcription, "text", "") or ""
            return text.strip()

        except GroqError as ge:
            logger.warning(f"Groq transcription with {self.primary_model} encountered an issue: {ge}. Retrying with {self.fallback_model}...")
            # 2. Retry with fallback model (whisper-large-v3)
            try:
                transcription = self.client.audio.transcriptions.create(
                    file=file_tuple,
                    model=self.fallback_model,
                    response_format="json",
                    language="en",
                    temperature=0.0
                )
                text = getattr(transcription, "text", "") or ""
                return text.strip()
            except Exception as fe:
                logger.error(f"Fallback transcription with {self.fallback_model} failed: {fe}")
                raise RuntimeError("Speech transcription failed.") from fe

        except Exception as e:
            logger.error(f"Groq transcription error: {e}")
            raise RuntimeError("Speech transcription failed.") from e
