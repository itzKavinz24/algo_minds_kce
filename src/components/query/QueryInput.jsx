import React, { useRef, useEffect } from 'react';
import { ArrowRight, Loader2, X } from 'lucide-react';
import VoiceButton from './VoiceButton';

export default function QueryInput({
  query,
  setQuery,
  onSubmit,
  isLoading,
  placeholder = "Ask a question about your business data...",
  autoFocus = false,
  showButton = true,
  buttonLabel = "Analyze",
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [query]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  const handleVoiceTranscript = (text) => {
    setQuery((prev) => (prev ? `${prev} ${text}` : text));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const clearInput = () => {
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Input Box Container */}
      <div className="w-full bg-white border border-[#E6E9E5] focus-within:border-[#3F8F68] focus-within:ring-2 focus-within:ring-[#3F8F68]/15 rounded-card p-3 sm:p-4 transition-all duration-150">
        <div className="flex items-start gap-2">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={2}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[#202522] placeholder-[#69716C]/60 text-base resize-none focus:outline-none leading-relaxed min-h-[44px]"
          />

          <div className="flex items-center gap-1 shrink-0 self-end">
            {query && !isLoading && (
              <button
                type="button"
                onClick={clearInput}
                className="p-1.5 text-[#69716C] hover:text-[#202522] rounded-btn transition-colors"
                aria-label="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <VoiceButton onTranscript={handleVoiceTranscript} disabled={isLoading} />
          </div>
        </div>
      </div>

      {/* Centered Analyze Button */}
      {showButton && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!query.trim() || isLoading}
          className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-btn text-sm font-medium transition-all ${
            !query.trim() || isLoading
              ? 'bg-[#E6E9E5] text-[#69716C] cursor-not-allowed'
              : 'bg-[#3F8F68] hover:bg-[#347655] text-white shadow-sm hover:shadow active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>{buttonLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
