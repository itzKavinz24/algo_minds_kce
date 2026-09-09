"""HTTP API for AgentVerse analytics and Hugging Face speech transcription."""

import json
import os
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from dotenv import load_dotenv
from huggingface_hub import InferenceClient

from orchestrator import Orchestrator


load_dotenv()
ORCHESTRATOR = Orchestrator()
MAX_AUDIO_BYTES = 25 * 1024 * 1024
HF_ASR_MODEL = os.getenv("HF_ASR_MODEL", "openai/whisper-large-v3-turbo")


class AgentVerseHandler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {
                "status": "ok",
                "service": "agentverse-orchestrator",
                "speech": "configured" if os.getenv("HF_TOKEN") else "missing_hf_token",
                "speechModel": HF_ASR_MODEL,
            })
        else:
            self._send(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/api/query":
            self._handle_query()
        elif self.path == "/api/speech-to-text":
            self._handle_speech_to_text()
        else:
            self._send(404, {"error": "Not found"})

    def _handle_query(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._send(400, {"error": "Request body must be valid JSON."})
            return
        result = ORCHESTRATOR.handle_query(payload.get("query", ""), payload.get("sessionId", "default"))
        self._send(200 if result["status"] == "success" else 422, result)

    def _handle_speech_to_text(self):
        token = os.getenv("HF_TOKEN", "").strip()
        if not token:
            self._send(503, {"success": False, "text": "", "error": "HF_TOKEN is not configured on the backend."})
            return

        try:
            audio = self._read_uploaded_file()
            client = InferenceClient(provider="hf-inference", api_key=token)
            output = client.automatic_speech_recognition(audio, model=HF_ASR_MODEL)
            if isinstance(output, dict):
                transcript = str(output.get("text", "")).strip()
            else:
                transcript = str(getattr(output, "text", output) or "").strip()
            if not transcript:
                self._send(422, {"success": False, "text": "", "error": "No speech could be recognized."})
                return
            self._send(200, {"success": True, "text": transcript, "error": None})
        except ValueError as exc:
            self._send(400, {"success": False, "text": "", "error": str(exc)})
        except Exception as exc:
            self._send(502, {"success": False, "text": "", "error": f"Speech transcription failed: {type(exc).__name__}"})

    def _read_uploaded_file(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type.lower():
            raise ValueError("Audio must be uploaded as multipart/form-data.")
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            raise ValueError("Audio recording is empty.")
        if length > MAX_AUDIO_BYTES:
            raise ValueError("Audio recording exceeds the 25 MB limit.")
        raw = self.rfile.read(length)
        envelope = (
            f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8") + raw
        )
        message = BytesParser(policy=policy.default).parsebytes(envelope)
        for part in message.iter_parts():
            if part.get_param("name", header="content-disposition") == "file":
                audio = part.get_payload(decode=True) or b""
                if not audio:
                    raise ValueError("Audio recording is empty.")
                return audio
        raise ValueError("Multipart request does not contain a 'file' upload.")

    def log_message(self, format, *args):
        return


def run():
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print(f"AgentVerse API listening on http://{host}:{port}")
    ThreadingHTTPServer((host, port), AgentVerseHandler).serve_forever()


if __name__ == "__main__":
    run()
