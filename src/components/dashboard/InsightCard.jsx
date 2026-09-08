import React from 'react';

export default function InsightCard({ insight }) {
  if (!insight) return null;

  return (
    <div className="p-6 rounded-card bg-white border border-[#E6E9E5] shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#3F8F68]"></span>
          <h4 className="text-xs font-semibold text-[#69716C] uppercase tracking-wider">
            Key Insight
          </h4>
        </div>

        <p className="text-base font-semibold text-[#202522] leading-snug tracking-tight mb-3">
          {insight}
        </p>
      </div>

      <div className="pt-3 border-t border-[#E6E9E5]/60 text-xs text-[#69716C] flex items-center justify-between">
        <span>Validated from database records</span>
        <span className="text-[#3F8F68] font-medium">Consistent trend</span>
      </div>
    </div>
  );
}
