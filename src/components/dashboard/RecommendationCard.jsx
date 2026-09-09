import React from 'react';

export default function RecommendationCard({ recommendations = [], onSelectRecommendation }) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return null;

  return (
    <div className="p-5 sm:p-6 rounded-card bg-white border border-[#DDE6E1] shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-semibold text-[#66736C] uppercase tracking-wider">
            Next steps
          </h4>
          <span className="text-[11px] text-[#66736C]">
            Click to follow up
          </span>
        </div>

        <div className="space-y-1.5">
          {recommendations.map((rec, idx) => {
            const stepIndex = idx + 1;
            const parts = rec.includes(' — ') ? rec.split(' — ') : rec.includes(': ') ? rec.split(': ') : [rec];
            const title = parts[0];
            const desc = parts[1] || '';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectRecommendation && onSelectRecommendation(title)}
                className="w-full text-left flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#F4F7F5] transition-colors group focus-visible:outline-none"
                title="Click to ask this follow-up question"
              >
                <span className="text-xs font-semibold text-[#176B52] font-mono mt-0.5 shrink-0 min-w-[16px]">
                  {stepIndex}.
                </span>
                <div className="text-xs sm:text-sm text-[#18221E] leading-relaxed">
                  <span className="font-semibold text-[#18221E] group-hover:text-[#176B52] transition-colors">
                    {title}
                  </span>
                  {desc && <span className="text-[#66736C] block mt-0.5 text-xs">{desc}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-[#DDE6E1]/60 text-xs text-[#66736C] flex items-center justify-between">
        <span>Actionable recommendations</span>
        <span className="text-[#176B52] font-medium">Prioritized</span>
      </div>
    </div>
  );
}
