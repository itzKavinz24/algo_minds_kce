import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { transcribeAudio } from '../services/speechService';

export default function VoiceInput({
  onTranscript,
  disabled = false,
  onStateChange,
}) {
  const [status, setStatus] = useState('IDLE'); // 'IDLE' | 'RECORDING' | 'TRANSCRIBING' | 'SUCCESS' | 'ERROR'
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
          setStatus('SUCCESS');
          setTimeout(() => {
            setStatus('IDLE');
          }, 1800);
        } catch (err) {
          console.warn('[Speech Recognition Error]', err);
          setStatus('ERROR');
          setErrorMessage("Couldn't transcribe your voice. Try again.");
        }
      };

      mediaRecorder.start();
      setStatus('RECORDING');
      setErrorMessage('');
    } catch (err) {
      console.warn('[Microphone Permission Error]', err);
      setStatus('ERROR');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access denied. Please allow microphone permission.');
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
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDF2F2] border border-[#D76565]/30 text-xs text-[#D76565] shadow-2xs animate-fadeIn min-h-[36px]">
        <span className="w-2 h-2 rounded-full bg-[#D76565] animate-pulse shrink-0"></span>
        <span className="font-semibold text-xs">Listening...</span>
        <button
          type="button"
          onClick={stopRecording}
          className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white hover:bg-[#FBE4E4] text-[#D76565] font-semibold text-xs shadow-2xs transition-colors"
          title="Done speaking"
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
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E3F2EC] border border-[#176B52]/20 text-xs text-[#176B52] shadow-2xs animate-fadeIn min-h-[36px]">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#176B52]" />
        <span className="font-semibold text-xs">Transcribing...</span>
      </div>
    );
  }

  // 3. SUCCESS STATE
  if (status === 'SUCCESS') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E3F2EC] border border-[#176B52]/20 text-xs text-[#176B52] shadow-2xs animate-fadeIn min-h-[36px]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3E9B68]"></span>
        <span className="font-medium text-xs">Transcript ready</span>
      </div>
    );
  }

  // 4. ERROR STATE
  if (status === 'ERROR') {
    return (
      <div className="relative inline-flex items-center gap-1.5 text-xs text-[#D76565] bg-[#FDF2F2] border border-[#D76565]/30 px-3 py-1.5 rounded-md shadow-2xs animate-fadeIn max-w-xs min-h-[36px]">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate text-[11px]" title={errorMessage}>
          {errorMessage || "Couldn't transcribe your voice. Try again."}
        </span>
        <button
          type="button"
          onClick={startRecording}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white hover:bg-[#FBE4E4] text-[#D76565] font-medium text-[10px] ml-1 shrink-0"
          title="Retry voice recording"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          <span>Retry</span>
        </button>
        <button
          type="button"
          onClick={handleDismissError}
          className="p-0.5 text-[#D76565]/70 hover:text-[#D76565] ml-0.5 shrink-0"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // 5. IDLE STATE: Friendly button with clear "Click to speak" indicator
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      aria-label="Click to speak your analytics question"
      title="Click to speak your question"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F7F5] hover:bg-[#E3F2EC] text-[#66736C] hover:text-[#176B52] border border-[#DDE6E1] hover:border-[#176B52]/30 text-xs font-medium transition-all duration-180 disabled:opacity-40 disabled:cursor-not-allowed group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B52]/20 min-h-[36px]"
    >
      <Mic className="w-3.5 h-3.5 text-[#176B52] group-hover:scale-110 transition-transform duration-180" />
      <span className="hidden sm:inline font-medium">Click to speak</span>
    </button>
  );
}
