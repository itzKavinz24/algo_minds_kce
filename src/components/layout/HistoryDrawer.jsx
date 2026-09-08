import React from 'react';
import { X, Clock, ArrowRight } from 'lucide-react';

export default function HistoryDrawer({
  isOpen,
  onClose,
  recentQueries = [],
  onSelectQuery,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-sm bg-white h-full shadow-lg border-l border-[#E6E9E5] p-6 flex flex-col z-10 animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E9E5] mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#69716C]" />
            <h3 className="text-sm font-semibold text-[#202522]">Recent Questions</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {recentQueries.length === 0 ? (
            <p className="text-xs text-[#69716C] text-center py-8">
              No recent questions yet
            </p>
          ) : (
            recentQueries.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectQuery(item);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg border border-[#E6E9E5] hover:border-[#3F8F68]/40 hover:bg-[#F7F8F6] transition-all text-xs text-[#202522] flex items-center justify-between group"
              >
                <span className="line-clamp-2 pr-2">{item}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#69716C] opacity-0 group-hover:opacity-100 group-hover:text-[#3F8F68] transition-opacity shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
