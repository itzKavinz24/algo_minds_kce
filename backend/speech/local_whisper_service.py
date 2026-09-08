"""
Local Whisper Speech-to-Text Service for AGENTVERSE.
Uses faster-whisper with Whisper Large-v3 Turbo running 100% locally on device.
Zero external API calls, zero API keys required.
Automatically utilizes GPU (CUDA float16) with safe CPU fallback (int8).
"""

import os
import io
import time
import logging
import tempfile
from typing import Optional, Tuple
from pathlib import Path

from dotenv import load_dotenv

# Load backend environment variables if present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

logger = logging.getLogger("local_whisper_service")

# Model configuration
DEFAULT_MODEL = os.getenv("WHISPER_MODEL", "large-v3-turbo")

def setup_cuda_paths():
    """Add nvidia pip wheel bin directories to os.environ['PATH'] and os.add_dll_directory."""
    try:
        import site
        candidate_paths = []
        for s in site.getsitepackages():
            nvidia_dir = os.path.join(s, "nvidia")
            if os.path.exists(nvidia_dir):
                for root, dirs, files in os.walk(nvidia_dir):
                    if any(f.endswith(".dll") for f in files):
                        candidate_paths.append(root)
        for p in candidate_paths:
            if hasattr(os, "add_dll_directory"):
                try:
                    os.add_dll_directory(p)
                except Exception:
                    pass
            if p not in os.environ.get("PATH", ""):
                os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")
    except Exception as e:
        logger.debug(f"CUDA paths setup note: {e}")

class LocalWhisperService:
    _instance: Optional["LocalWhisperService"] = None

    def __init__(self, model_size_or_path: str = DEFAULT_MODEL):
        from faster_whisper import WhisperModel
        import ctranslate2
        import numpy as np

        self.model_name = model_size_or_path
        self.device = "cpu"
        self.compute_type = "int8"

        # Determine best available hardware device
        cuda_count = ctranslate2.get_cuda_device_count()
        logger.info(f"Detected {cuda_count} CUDA device(s) via ctranslate2.")

        if cuda_count > 0 and os.getenv("FORCE_CPU", "false").lower() != "true":
            try:
                setup_cuda_paths()
                logger.info(f"Attempting CUDA GPU initialization for Whisper '{self.model_name}' (float16)...")
                t0 = time.time()
                cuda_model = WhisperModel(
                    self.model_name,
                    device="cuda",
                    compute_type="float16"
                )
                # Verify CUDA cuBLAS/cuDNN runtime by testing a dummy silence slice
                dummy_audio = np.zeros(1600, dtype=np.float32)
                _ = list(cuda_model.transcribe(dummy_audio, beam_size=1)[0])

                self.model = cuda_model
                self.device = "cuda"
                self.compute_type = "float16"
                logger.info(f"Local Whisper GPU model successfully loaded and verified in {time.time()-t0:.2f}s.")
            except Exception as e:
                logger.warning(f"CUDA initialization or cuBLAS validation failed ({e}). Falling back to CPU...")
                t0 = time.time()
                self.model = WhisperModel(
                    self.model_name,
                    device="cpu",
                    compute_type="int8"
                )
                self.device = "cpu"
                self.compute_type = "int8"
                logger.info(f"Local Whisper CPU model loaded in {time.time()-t0:.2f}s.")
        else:
            logger.info(f"Initializing Whisper '{self.model_name}' on CPU (int8)...")
            t0 = time.time()
            self.model = WhisperModel(
                self.model_name,
                device="cpu",
                compute_type="int8"
            )
            self.device = "cpu"
            self.compute_type = "int8"
            logger.info(f"Local Whisper CPU model loaded in {time.time()-t0:.2f}s.")

    @classmethod
    def get_instance(cls) -> "LocalWhisperService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def transcribe(self, audio_bytes: bytes, filename: str = "audio.webm") -> str:
        """
        Transcribe audio bytes locally using Whisper Large-v3 Turbo.
        Accepts browser-produced WebM/Opus, WAV, MP3, OGG, etc.
        Cleans up all temporary files after transcription.
        """
        if not audio_bytes or len(audio_bytes) == 0:
            raise ValueError("Audio data is empty.")

        ext = os.path.splitext(filename)[1] or ".webm"
        temp_file_path = None

        try:
            # Write audio bytes to temporary file for faster-whisper / PyAV
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f_temp:
                f_temp.write(audio_bytes)
                temp_file_path = f_temp.name

            t0 = time.time()
            # Run local faster-whisper inference with VAD filtering
            segments, info = self.model.transcribe(
                temp_file_path,
                beam_size=5,
                temperature=0.0,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500),
            )

            # Collect transcript segments
            transcript_parts = [segment.text.strip() for segment in segments]
            full_transcript = " ".join(part for part in transcript_parts if part).strip()

            inference_duration = time.time() - t0
            logger.info(
                f"Local Whisper transcribed audio ({info.duration:.2f}s) in {inference_duration:.2f}s "
                f"[{self.device}:{self.compute_type}]: '{full_transcript}'"
            )

            return full_transcript

        except Exception as e:
            # If direct audio decoding failed, attempt FFmpeg WAV conversion as fallback
            logger.warning(f"Direct faster-whisper transcription encountered error: {e}. Attempting FFmpeg conversion...")
            return self._transcribe_with_ffmpeg_fallback(audio_bytes, filename)

        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass

    def _transcribe_with_ffmpeg_fallback(self, audio_bytes: bytes, filename: str) -> str:
        """Secondary fallback converting audio via FFmpeg to 16kHz mono WAV before transcription."""
        from speech.audio_converter import convert_to_wav

        wav_path = None
        try:
            wav_path = convert_to_wav(audio_bytes, original_filename=filename)
            segments, info = self.model.transcribe(
                wav_path,
                beam_size=5,
                temperature=0.0,
                vad_filter=True
            )
            transcript_parts = [segment.text.strip() for segment in segments]
            return " ".join(part for part in transcript_parts if part).strip()
        finally:
            if wav_path and os.path.exists(wav_path):
                try:
                    os.remove(wav_path)
                except Exception:
                    pass
