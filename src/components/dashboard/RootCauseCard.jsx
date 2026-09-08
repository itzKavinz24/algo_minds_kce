import React from 'react';
import { ArrowDownRight } from 'lucide-react';

export default function RootCauseCard({ rca, onSelectRecommendation }) {
  if (!rca) return null;

  return (
    <div className="p-5 sm:p-6 rounded-card bg-white border border-[#DDE6E1] shadow-2xs space-y-5 mb-6">
      {/* 1. Executive Headline */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-4 border-b border-[#DDE6E1]">
        <div>
          <span className="text-[11px] font-semibold text-[#D76565] uppercase tracking-wider block mb-1">
            Diagnostic Executive Report
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#18221E] tracking-tight">
            {rca.headline || `Sales decreased ${rca.metricDecline || '12%'}`}
          </h3>
          <p className="text-xs text-[#66736C] mt-0.5">
            {rca.metricPeriod || 'Variance against previous period'}
          </p>
        </div>

        {rca.metricDecline && (
          <div className="px-3.5 py-2 rounded-lg bg-[#FDF2F2] border border-[#D76565]/20 text-right shrink-0">
            <span className="text-lg sm:text-xl font-bold text-[#D76565] flex items-center justify-end gap-1 font-mono">
              <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
              {rca.metricDecline}
            </span>
          </div>
        )}
      </div>

      {/* 2. What changed? Numbered list */}
      {Array.isArray(rca.contributingFactors) && rca.contributingFactors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[#18221E] uppercase tracking-wider">
            What changed?
          </h4>

          <div className="space-y-2">
            {rca.contributingFactors.map((factor, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F4F7F5] border border-[#DDE6E1]/60"
              >
                <span className="w-5 h-5 rounded-full bg-white border border-[#DDE6E1] text-[#18221E] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 text-xs sm:text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-[#18221E]">{factor.name}</span>
                    <span className="font-mono text-xs font-semibold text-[#D76565]">
                      {factor.change || (factor.share ? `${factor.share}%` : '')}
                    </span>
                  </div>
                  {factor.reason && (
                    <p className="text-xs text-[#66736C] mt-0.5 leading-relaxed">
                      {factor.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Main Driver */}
      {rca.diagnosis && (
        <div className="p-4 rounded-lg bg-[#E3F2EC]/40 border border-[#176B52]/20 space-y-1">
          <h4 className="text-xs font-semibold text-[#176B52] uppercase tracking-wider">
            Main driver
          </h4>
          <p className="text-xs sm:text-sm text-[#18221E] leading-relaxed font-semibold">
            {rca.diagnosis}
          </p>
          {rca.evidence && (
            <p className="text-xs text-[#66736C] mt-1 leading-relaxed">
              {rca.evidence}
            </p>
          )}
        </div>
      )}

      {/* 4. Next Steps */}
      {rca.recommendation && (
        <div className="pt-3 border-t border-[#DDE6E1]/60">
          <h4 className="text-xs font-semibold text-[#66736C] uppercase tracking-wider mb-1.5">
            Next steps
          </h4>
          <button
            type="button"
            onClick={() => onSelectRecommendation && onSelectRecommendation(rca.recommendation)}
            className="w-full text-left p-2.5 rounded-lg hover:bg-[#F4F7F5] transition-colors border border-transparent hover:border-[#DDE6E1] group"
          >
            <p className="text-xs sm:text-sm text-[#18221E] group-hover:text-[#176B52] leading-relaxed font-medium">
              • {rca.recommendation}
            </p>
            <span className="text-[11px] text-[#66736C] block mt-1">
              Click to ask as follow-up question
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
