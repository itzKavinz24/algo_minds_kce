import React, { useRef, useEffect, useState } from 'react';
import { ArrowRight, Loader2, X, Database, ChevronDown } from 'lucide-react';
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
  sources = [],
  selectedSourceId = 'all',
  onSelectSource,
}) {
  const textareaRef = useRef(null);
  const [showSourceMenu, setShowSourceMenu] = useState(false);

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

  // Label for current selected source
  const selectedSourceName =
    selectedSourceId === 'all'
      ? 'All sources (Auto)'
      : sources.find((s) => s.id === selectedSourceId)?.name || 'Custom source';

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Input Box Container */}
      <div className="w-full bg-white border border-[#E6E9E5] focus-within:border-[#3F8F68] focus-within:ring-2 focus-within:ring-[#3F8F68]/15 rounded-card p-3 sm:p-4 transition-all duration-150 relative">
        {/* Source Selector Bar */}
        {sources && sources.length > 0 && onSelectSource && (
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E6E9E5]/60 text-xs">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSourceMenu(!showSourceMenu)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#F7F8F6] hover:bg-[#F2F4F0] border border-[#E6E9E5] text-[#69716C] hover:text-[#202522] transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-[#3F8F68]" />
                <span className="font-medium">Data source:</span>
                <span className="text-[#202522] font-semibold">{selectedSourceName}</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
              </button>

              {/* Source selection dropdown */}
              {showSourceMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowSourceMenu(false)}
                  />
                  <div className="absolute left-0 mt-1 w-56 bg-white border border-[#E6E9E5] rounded-card shadow-lg p-1.5 z-30 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSource('all');
                        setShowSourceMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                        selectedSourceId === 'all'
                          ? 'bg-[#EAF5EE] text-[#3F8F68] font-semibold'
                          : 'text-[#202522] hover:bg-[#F7F8F6]'
                      }`}
                    >
                      <span>All sources (Auto-route)</span>
                      <span className="text-[10px] text-[#69716C]">MCP</span>
                    </button>

                    <div className="my-1 border-t border-[#E6E9E5]" />

                    {sources.map((src) => {
                      const isSelected = selectedSourceId === src.id;
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => {
                            onSelectSource(src.id);
                            setShowSourceMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#EAF5EE] text-[#3F8F68] font-semibold'
                              : 'text-[#202522] hover:bg-[#F7F8F6]'
                          }`}
                        >
                          <span className="truncate">{src.name}</span>
                          <span className="text-[10px] font-mono text-[#69716C] ml-1 shrink-0">
                            {src.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <span className="text-[11px] text-[#69716C] hidden sm:inline">
              Ask your data in plain English
            </span>
          </div>
        )}

        {/* Text Input Area */}
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
