import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  const message = error?.message || 'Unable to complete the query at this moment.';

  return (
    <div className="w-full max-w-lg mx-auto py-12 px-4 animate-fadeIn">
      <div className="bg-white border border-[#E6E9E5] rounded-card p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-btn bg-[#FDECEC] text-[#C85C5C] flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#202522] mb-1">
              Unable to analyze
            </h3>
            <p className="text-xs text-[#69716C] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {onRetry && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn text-xs font-medium bg-[#3F8F68] hover:bg-[#347655] text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
