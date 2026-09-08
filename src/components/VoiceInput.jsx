import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { transcribeAudio } from '../services/speechService';

export default function VoiceInput({
  onTranscript,
  disabled = false,
  onStateChange,
}) {
  const [status, setStatus] = useState('IDLE'); // 'IDLE' | 'RECORDING' | 'TRANSCRIBING' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Inform parent when recording/transcribing states change
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isRecording: status === 'RECORDING',
        isTranscribing: status === 'TRANSCRIBING',
        status,
      });
    }
  }, [status, onStateChange]);

  // Clean up all tracks and recorder on unmount
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startRecording = async () => {
    if (disabled || status === 'RECORDING' || status === 'TRANSCRIBING') return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('ERROR');
      setErrorMessage('Microphone is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      audioStreamRef.current = stream;

      // Detect supported mimeType
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported || !MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const recorderOptions = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks immediately so hardware mic indicator turns off
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];

        if (!chunks || chunks.length === 0) {
          setStatus('IDLE');
          return;
        }

        const audioBlob = new Blob(chunks, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        setStatus('TRANSCRIBING');
        setErrorMessage('');

        try {
          const text = await transcribeAudio(audioBlob);
          if (text && onTranscript) {
            onTranscript(text);
          }
          setStatus('IDLE');
        } catch (err) {
          console.warn('[Speech Recognition Error]', err);
          setStatus('ERROR');
          setErrorMessage("Couldn't transcribe your voice. Please try again.");
        }
      };

      mediaRecorder.start();
      setStatus('RECORDING');
      setErrorMessage('');
    } catch (err) {
      console.warn('[Microphone Permission Error]', err);
      setStatus('ERROR');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. You can continue using text input.');
      } else {
        setErrorMessage('Unable to access microphone.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[Stop Recording Error]', err);
      }
    }
  };

  const handleDismissError = () => {
    setStatus('IDLE');
    setErrorMessage('');
  };

  // 1. RECORDING STATE
  if (status === 'RECORDING') {
    return (
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FDECEC] border border-[#F5C2C2] text-xs text-[#C85C5C] shadow-2xs animate-fadeIn">
        <span className="w-2 h-2 rounded-full bg-[#E04B4B] animate-pulse shrink-0"></span>
        <span className="font-medium">Listening...</span>
        <button
          type="button"
          onClick={stopRecording}
          className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-[#FBE4E4] text-[#C85C5C] font-semibold text-[11px] shadow-2xs transition-colors"
          title="Stop recording and transcribe"
        >
          <Square className="w-2.5 h-2.5 fill-current" />
          <span>Stop</span>
        </button>
      </div>
    );
  }

  // 2. TRANSCRIBING STATE
  if (status === 'TRANSCRIBING') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF5EE] border border-[#3F8F68]/25 text-xs text-[#3F8F68] shadow-2xs animate-fadeIn">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="font-medium">Transcribing...</span>
      </div>
    );
  }

  // 3. ERROR STATE
  if (status === 'ERROR') {
    return (
      <div className="relative inline-flex items-center gap-1.5 text-xs text-[#C85C5C] bg-[#FDECEC] border border-[#F5C2C2] px-2 py-1 rounded-md shadow-2xs animate-fadeIn max-w-xs">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate" title={errorMessage}>
          {errorMessage}
        </span>
        <button
          type="button"
          onClick={startRecording}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white hover:bg-[#FBE4E4] text-[#C85C5C] font-medium text-[11px] ml-1 shrink-0"
          title="Retry voice recording"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          <span>Retry</span>
        </button>
        <button
          type="button"
          onClick={handleDismissError}
          className="p-0.5 text-[#C85C5C]/70 hover:text-[#C85C5C] ml-0.5 shrink-0"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // 4. IDLE STATE (Default minimal microphone button)
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      aria-label="Ask using voice"
      title="Speak your question (Whisper Speech-to-Text)"
      className="p-1.5 rounded-btn text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Mic className="w-4 h-4 text-[#3F8F68]" />
    </button>
  );
}
