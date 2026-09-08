import React from 'react';

export default function RecommendationCard({ recommendations = [] }) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return null;

  return (
    <div className="p-6 rounded-card bg-white border border-[#E6E9E5] shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#69716C]"></span>
          <h4 className="text-xs font-semibold text-[#69716C] uppercase tracking-wider">
            Next steps
          </h4>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const stepNum = String(idx + 1).padStart(2, '0');
            // Split if contains a dash or colon for title vs description
            const parts = rec.includes(' — ') ? rec.split(' — ') : rec.includes(': ') ? rec.split(': ') : [rec];
            const title = parts[0];
            const desc = parts[1] || '';

            return (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-xs font-mono font-bold text-[#3F8F68] mt-0.5 shrink-0">
                  {stepNum} —
                </span>
                <div className="text-xs sm:text-sm text-[#202522] leading-relaxed">
                  <span className="font-semibold text-[#202522]">{title}</span>
                  {desc && <span className="text-[#69716C] block mt-0.5">{desc}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-[#E6E9E5]/60 text-xs text-[#69716C] flex items-center justify-between">
        <span>Prioritized action plan</span>
        <span>High impact</span>
      </div>
    </div>
  );
}
