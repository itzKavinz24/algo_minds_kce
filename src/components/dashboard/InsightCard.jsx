import React from 'react';
import { FileText } from 'lucide-react';

function highlightMetrics(text) {
  if (!text) return '';
  // Match percentages, currencies, metric figures (e.g. ₹12.4M, 18%, 46%, Q4)
  const regex = /(₹[\d,.]+[a-zA-Z]*|\b\d+(?:\.\d+)?%|\bQ[1-4]\b|\b\d+(?:,\d{3})*(?:\.\d+)?\b)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (regex.test(part)) {
      return (
        <strong key={i} className="font-bold text-[#176B52]">
          {part}
        </strong>
      );
    }
    return part;
  });
}

export default function InsightCard({ insight }) {
  if (!insight) return null;

  return (
    <div className="p-5 sm:p-6 rounded-card bg-white border border-[#DDE6E1] shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[#E3F2EC] flex items-center justify-center text-[#176B52] shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-semibold text-[#176B52] uppercase tracking-wider">
            Insight
          </h4>
        </div>

        <p className="text-sm sm:text-base font-normal text-[#18221E] leading-relaxed tracking-tight mb-4">
          {highlightMetrics(insight)}
        </p>
      </div>

      <div className="pt-3 border-t border-[#DDE6E1]/60 text-xs text-[#66736C] flex items-center justify-between">
        <span>Derived from current dataset</span>
        <span className="text-[#176B52] font-medium">Verified insight</span>
      </div>
    </div>
  );
}
