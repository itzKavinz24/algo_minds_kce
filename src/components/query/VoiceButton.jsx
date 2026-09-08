import React, { useState, useEffect, useRef } from 'react';
import { Mic, AlertCircle } from 'lucide-react';

export default function VoiceButton({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage('');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && onTranscript) {
          onTranscript(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage('Voice input error.');
        }
        setTimeout(() => setErrorMessage(''), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!isSupported) {
      setErrorMessage('Voice not supported.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        setErrorMessage('');
        recognitionRef.current?.start();
      } catch {
        recognitionRef.current?.stop();
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled || !isSupported}
        aria-label={isListening ? 'Stop voice recording' : 'Ask using voice'}
        className={`p-2 rounded-btn transition-colors ${
          isListening
            ? 'bg-[#FDECEC] text-[#C85C5C] animate-pulse'
            : isSupported
            ? 'text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0]'
            : 'text-[#69716C]/40 cursor-not-allowed'
        }`}
        title={!isSupported ? 'Voice not supported in this browser' : 'Speak your question'}
      >
        <Mic className="w-4 h-4" />
      </button>

      {errorMessage && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-[#E6E9E5] text-xs text-[#C85C5C] px-2.5 py-1 rounded shadow-sm whitespace-nowrap flex items-center gap-1 z-50">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
