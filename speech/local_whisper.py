"""Lazy, process-local Whisper Large-v3 Turbo transcription service."""

import os
from io import BytesIO
from pathlib import Path
from threading import Lock
from typing import Dict


class LocalWhisperService:
    """Load Faster Whisper once and reuse it for browser audio transcriptions."""

    def __init__(self) -> None:
        self.model_name = os.getenv("WHISPER_MODEL", "turbo")
        self.download_root = Path(
            os.getenv("WHISPER_MODEL_DIR", "models/whisper-turbo")
        ).resolve()
        self.device = os.getenv("WHISPER_DEVICE", "cuda").strip().lower()
        default_compute = "float16" if self.device == "cuda" else "int8"
        self.compute_type = os.getenv("WHISPER_COMPUTE_TYPE", default_compute)
        self._model = None
        self._load_lock = Lock()
        self._transcribe_lock = Lock()

    def status(self) -> Dict[str, str]:
        return {
            "provider": "local-faster-whisper",
            "model": self.model_name,
            "device": self.device,
            "computeType": self.compute_type,
            "state": "loaded" if self._model is not None else "ready",
        }

    def transcribe(self, audio: bytes) -> Dict[str, object]:
        if not audio:
            raise ValueError("Audio recording is empty.")
        model = self._get_model()
        with self._transcribe_lock:
            segments, info = model.transcribe(
                BytesIO(audio),
                beam_size=5,
                vad_filter=True,
                condition_on_previous_text=False,
            )
            text = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "text": text,
            "language": getattr(info, "language", None),
            "languageProbability": getattr(info, "language_probability", None),
            "duration": getattr(info, "duration", None),
        }

    def _get_model(self):
        if self._model is not None:
            return self._model
        with self._load_lock:
            if self._model is None:
                from faster_whisper import WhisperModel

                self._model = WhisperModel(
                    self.model_name,
                    device=self.device,
                    compute_type=self.compute_type,
                    download_root=str(self.download_root),
                    local_files_only=True,
                )
        return self._model

