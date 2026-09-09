"""Small multipart audio reader used by the dependency-free HTTP server."""

from email import policy
from email.parser import BytesParser


def read_audio_upload(handler, max_bytes: int) -> bytes:
    content_type = handler.headers.get("Content-Type", "")
    if "multipart/form-data" not in content_type.lower():
        raise ValueError("Audio must be uploaded as multipart/form-data.")
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        raise ValueError("Audio recording is empty.")
    if length > max_bytes:
        raise ValueError("Audio recording exceeds the 25 MB limit.")
    raw = handler.rfile.read(length)
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

