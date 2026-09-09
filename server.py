"""Dependency-free HTTP API exposing GET /health and POST /api/query."""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from orchestrator import Orchestrator
from speech import LocalWhisperService
from speech.multipart import read_audio_upload


ORCHESTRATOR = Orchestrator()
SPEECH = LocalWhisperService()
MAX_AUDIO_BYTES = 25 * 1024 * 1024


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
                "speech": SPEECH.status(),
            })
        else:
            self._send(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/api/speech-to-text":
            self._handle_speech_to_text()
            return
        if self.path != "/api/query":
            self._send(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._send(400, {"error": "Request body must be valid JSON."})
            return
        result = ORCHESTRATOR.handle_query(payload.get("query", ""), payload.get("sessionId", "default"))
        self._send(200 if result["status"] == "success" else 422, result)

    def _handle_speech_to_text(self):
        try:
            audio = read_audio_upload(self, MAX_AUDIO_BYTES)
            result = SPEECH.transcribe(audio)
            if not result["text"]:
                self._send(422, {"success": False, "text": "", "error": "No speech could be recognized."})
                return
            self._send(200, {"success": True, **result, "error": None})
        except ValueError as exc:
            self._send(400, {"success": False, "text": "", "error": str(exc)})
        except Exception as exc:
            self._send(500, {
                "success": False,
                "text": "",
                "error": f"Local speech transcription failed: {type(exc).__name__}: {exc}",
            })
    def log_message(self, format, *args):
        return


def run():
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print(f"AgentVerse API listening on http://{host}:{port}")
    ThreadingHTTPServer((host, port), AgentVerseHandler).serve_forever()


if __name__ == "__main__":
    run()
