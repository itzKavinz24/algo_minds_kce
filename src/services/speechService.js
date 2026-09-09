/**
 * Speech Service for AGENTVERSE.
 * Handles audio recording transmission to the backend speech-to-text endpoint (Local faster-whisper).
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 120000;

export class SpeechError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'SpeechError';
    this.status = status;
  }
}

/**
 * Sends an audio blob (WebM, Opus, WAV) to the backend local Whisper speech-to-text service.
 * @param {Blob} audioBlob - Audio recording blob from MediaRecorder
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeAudio(audioBlob) {
  if (!audioBlob || audioBlob.size === 0) {
    throw new SpeechError('Audio recording was empty. Please try speaking again.', 400);
  }

  const formData = new FormData();
  // Determine appropriate filename extension
  const mime = audioBlob.type || 'audio/webm';
  const ext = mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'webm';
  formData.append('file', audioBlob, `recording.${ext}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const endpoint = `${BASE_URL.replace(/\/$/, '')}/api/speech-to-text`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404 || response.status === 502 || response.status === 503) {
        throw new SpeechError('Speech recognition service is currently unavailable.', response.status);
      }
      throw new SpeechError('Unable to transcribe audio.', response.status);
    }

    const data = await response.json();

    if (!data.success) {
      throw new SpeechError(
        data.error || "Couldn't understand the recording. Please try again.",
        422
      );
    }

    return (data.text || '').trim();
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new SpeechError('Transcription request timed out. Please try again.', 408);
    }

    if (err instanceof SpeechError) {
      throw err;
    }

    // Network error (e.g. backend offline)
    console.warn('[Speech Service Error]', err);
    throw new SpeechError('Speech recognition is currently unavailable.', 503);
  }
}
