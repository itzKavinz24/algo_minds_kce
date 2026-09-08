import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  const [showTechDetails, setShowTechDetails] = useState(false);
  const rawErrorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));

  return (
    <div className="w-full max-w-lg mx-auto py-16 px-4 animate-fadeIn">
      <div className="bg-white border border-[#DDE6E1] rounded-card p-6 sm:p-8 shadow-2xs text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#FDF2F2] text-[#D76565] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#18221E] tracking-tight">
            Something went wrong while analyzing your question.
          </h3>
          <p className="text-xs sm:text-sm text-[#66736C] mt-1.5 leading-relaxed max-w-sm mx-auto">
            Please verify your query phrasing, check that your data sources are connected, or try again.
          </p>
        </div>

        {onRetry && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[40px] inline-flex items-center justify-center gap-2 px-6 py-2 rounded-btn text-xs sm:text-sm font-semibold bg-[#176B52] hover:bg-[#125641] text-white transition-colors shadow-2xs active:scale-[0.99]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {/* Collapsible Technical Details */}
        {rawErrorMessage && (
          <div className="pt-3 border-t border-[#DDE6E1]/60 text-left">
            <button
              type="button"
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="inline-flex items-center gap-1 text-xs text-[#66736C] hover:text-[#18221E] font-medium transition-colors"
            >
              <span>Technical details</span>
              {showTechDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTechDetails && (
              <pre className="mt-2 p-3 rounded-lg bg-[#F4F7F5] border border-[#DDE6E1] text-[11px] font-mono text-[#D76565] overflow-x-auto whitespace-pre-wrap break-all">
                {rawErrorMessage}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
