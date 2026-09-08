import React, { useRef, useEffect, useState } from 'react';
import { ArrowRight, Loader2, X, Database, ChevronDown } from 'lucide-react';
import VoiceInput from '../VoiceInput';

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
    if (!text) return;
    const clean = text.trim();
    const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
    setQuery((prev) => (prev ? `${prev.trim()} ${formatted}` : formatted));
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
      ? 'All sources'
      : sources.find((s) => s.id === selectedSourceId)?.name || 'All sources';

  return (
    <div className="w-full">
      {/* Integrated Query Card */}
      <div className="w-full bg-white border border-[#DDE6E1] hover:border-[#CBD5D0] focus-within:border-[#176B52] focus-within:ring-2 focus-within:ring-[#176B52]/15 rounded-card p-4 sm:p-5 transition-all shadow-2xs relative">
        {/* Main Text Input & Microphone Row */}
        <div className="flex items-start gap-3">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={2}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[#18221E] placeholder-[#66736C]/70 text-sm sm:text-base resize-none focus:outline-none leading-relaxed min-h-[56px]"
          />

          {/* Top-Right Voice & Clear Actions */}
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {query && !isLoading && (
              <button
                type="button"
                onClick={clearInput}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 text-[#66736C] hover:text-[#18221E] hover:bg-[#EEF3F0] rounded-full transition-colors"
                aria-label="Clear query"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />
          </div>
        </div>

        {/* Bottom Bar: Source Selector on Left, Analyze Button on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 mt-2 border-t border-[#DDE6E1]/60 text-xs">
          {/* Left: Data Source Picker & Keyboard Hint */}
          <div className="flex items-center gap-3">
            {sources && sources.length > 0 && onSelectSource ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSourceMenu(!showSourceMenu)}
                  className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F7F5] hover:bg-[#EEF3F0] border border-[#DDE6E1] text-[#66736C] hover:text-[#18221E] transition-colors text-xs font-medium"
                >
                  <Database className="w-3.5 h-3.5 text-[#176B52]" />
                  <span>Data source:</span>
                  <span className="text-[#18221E] font-semibold truncate max-w-[140px] sm:max-w-none">
                    {selectedSourceName}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                </button>

                {showSourceMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowSourceMenu(false)}
                    />
                    <div className="absolute left-0 bottom-full mb-1.5 w-56 bg-white border border-[#DDE6E1] rounded-card shadow-lg p-1.5 z-30 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSource('all');
                          setShowSourceMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between ${
                          selectedSourceId === 'all'
                            ? 'bg-[#E3F2EC] text-[#176B52] font-semibold'
                            : 'text-[#18221E] hover:bg-[#F4F7F5]'
                        }`}
                      >
                        <span>All sources</span>
                        <span className="text-[10px] text-[#3E9B68] font-medium">Auto</span>
                      </button>

                      <div className="my-1 border-t border-[#DDE6E1]" />

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
                            className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#E3F2EC] text-[#176B52] font-semibold'
                                : 'text-[#18221E] hover:bg-[#F4F7F5]'
                            }`}
                          >
                            <span className="truncate">{src.name}</span>
                            <span className="text-[10px] text-[#66736C] ml-1 shrink-0">
                              Connected
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            <span className="hidden md:inline text-[11px] text-[#66736C]">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[#EEF3F0] text-[#18221E] font-mono text-[10px] border border-[#DDE6E1]">Enter ↵</kbd> to analyze
            </span>
          </div>

          {/* Right: Embedded Analyze Button */}
          {showButton && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!query.trim() || isLoading}
              className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-btn text-sm font-semibold transition-all duration-200 self-end sm:self-auto w-full sm:w-auto ${
                !query.trim() || isLoading
                  ? 'bg-[#DDE6E1] text-[#66736C] cursor-not-allowed'
                  : 'bg-[#176B52] hover:bg-[#125641] text-white shadow-2xs hover:shadow-xs active:scale-[0.98]'
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
      </div>
    </div>
  );
}
