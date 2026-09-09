import React, { useState, useMemo } from 'react';
import { X, Clock, ArrowRight, Search } from 'lucide-react';

const FRIENDLY_TIMESTAMPS = [
  'Today, 8:42 PM',
  'Today, 7:15 PM',
  'Today, 4:30 PM',
  'Yesterday, 6:12 PM',
  'Yesterday, 2:45 PM',
  '2 days ago',
  '3 days ago',
  'Last week',
];

export default function HistoryDrawer({
  isOpen,
  onClose,
  recentQueries = [],
  onSelectQuery,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQueries = useMemo(() => {
    if (!searchQuery.trim()) return recentQueries;
    const q = searchQuery.toLowerCase();
    return recentQueries.filter((item) => item.toLowerCase().includes(q));
  }, [recentQueries, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-sm bg-white h-full shadow-lg border-l border-[#DDE6E1] p-5 sm:p-6 flex flex-col z-10 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#DDE6E1] mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#176B52]" />
            <h3 className="text-sm font-semibold text-[#18221E]">Recent Questions</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#66736C] hover:text-[#18221E] hover:bg-[#EEF3F0] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Close history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search filter if more than 3 items */}
        {recentQueries.length > 3 && (
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-[#66736C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter recent questions..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#DDE6E1] text-xs text-[#18221E] bg-[#F4F7F5]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#176B52]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#66736C] hover:text-[#18221E]"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
          {filteredQueries.length === 0 ? (
            <div className="text-center py-12 text-[#66736C] text-xs">
              <Clock className="w-6 h-6 text-[#66736C]/40 mx-auto mb-2" />
              <p>{searchQuery ? 'No matching questions found' : 'No recent questions yet'}</p>
            </div>
          ) : (
            filteredQueries.map((item, idx) => {
              const lower = item.toLowerCase();
              const resultType = lower.includes('trend')
                ? 'Trend'
                : lower.includes('category') || lower.includes('distribution')
                ? 'Breakdown'
                : lower.includes('why') || lower.includes('decrease')
                ? 'Diagnostics'
                : lower.includes('total') || lower.includes('revenue')
                ? 'Summary'
                : 'Report';

              const timestamp = FRIENDLY_TIMESTAMPS[idx] || 'Recently';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectQuery(item);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-lg border border-[#DDE6E1] hover:border-[#176B52]/50 hover:bg-[#F4F7F5] transition-all group focus-visible:outline-none min-h-[44px]"
                >
                  <div className="text-xs font-semibold text-[#18221E] line-clamp-2 mb-2 group-hover:text-[#176B52] transition-colors leading-snug">
                    {item}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#66736C]">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#E3F2EC] text-[#176B52] font-semibold text-[10px]">
                        {resultType}
                      </span>
                      <span>·</span>
                      <span>{timestamp}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-[#66736C] opacity-0 group-hover:opacity-100 group-hover:text-[#176B52] transition-all transform group-hover:translate-x-0.5 shrink-0" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
