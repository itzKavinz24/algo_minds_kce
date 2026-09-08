"""
Audio converter utility for Vosk speech recognition.
Converts arbitrary browser audio (WebM/Opus, OGG, etc.) into:
- Sample rate: 16000 Hz
- Channels: 1 (Mono)
- Format: Signed 16-bit PCM WAV (pcm_s16le)
"""

import os
import subprocess
import tempfile
import logging

logger = logging.getLogger("speech_converter")

def get_ffmpeg_binary() -> str:
    """Resolve FFmpeg executable from imageio_ffmpeg or system PATH."""
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as e:
        logger.warning(f"imageio_ffmpeg not available: {e}. Falling back to 'ffmpeg'")
        return "ffmpeg"

def convert_to_wav(input_bytes: bytes, original_filename: str = "audio.webm") -> str:
    """
    Takes raw audio bytes, writes to a temporary file,
    converts via FFmpeg to 16kHz mono 16-bit PCM WAV,
    and returns the path to the converted WAV file.
    The caller is responsible for removing the returned WAV file when finished.
    """
    ext = os.path.splitext(original_filename)[1] or ".webm"
    temp_input = None
    temp_output = None

    try:
        # Write incoming bytes to temp file
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as fin:
            fin.write(input_bytes)
            temp_input = fin.name

        # Create output temp wav path
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as fout:
            temp_output = fout.name

        ffmpeg_cmd = [
            get_ffmpeg_binary(),
            "-y",
            "-i", temp_input,
            "-vn",                      # No video
            "-ar", "16000",             # 16 kHz sample rate
            "-ac", "1",                 # 1 channel (mono)
            "-c:a", "pcm_s16le",        # 16-bit signed PCM
            temp_output
        ]

        result = subprocess.run(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False
        )

        if result.returncode != 0:
            error_detail = result.stderr.decode("utf-8", errors="replace")
            logger.error(f"FFmpeg conversion failed: {error_detail}")
            raise RuntimeError("Audio conversion failed.")

        return temp_output

    finally:
        # Always clean up the temporary input file immediately
        if temp_input and os.path.exists(temp_input):
            try:
                os.remove(temp_input)
            except Exception:
                pass
