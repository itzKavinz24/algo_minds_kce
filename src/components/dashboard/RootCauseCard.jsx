import React from 'react';
import { ArrowDownRight } from 'lucide-react';

export default function RootCauseCard({ rca }) {
  if (!rca) return null;

  return (
    <div className="p-6 sm:p-7 rounded-card bg-white border border-[#E6E9E5] shadow-2xs space-y-6 mb-8">
      {/* Executive Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[#E6E9E5]">
        <div>
          <span className="text-[11px] font-semibold text-[#69716C] uppercase tracking-wider block mb-1">
            Diagnostic Analysis
          </span>
          <h3 className="text-xl font-bold text-[#202522] tracking-tight">
            {rca.headline || 'Why did revenue decline?'}
          </h3>
          <p className="text-xs text-[#69716C] mt-1">
            {rca.metricPeriod || 'Month-over-month variance report'}
          </p>
        </div>

        {rca.metricDecline && (
          <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#FDE8E8] text-right shrink-0">
            <span className="text-[11px] text-[#C85C5C] font-medium block">Net Change</span>
            <span className="text-2xl font-bold text-[#C85C5C] flex items-center justify-end gap-0.5 font-mono">
              <ArrowDownRight className="w-5 h-5" />
              {rca.metricDecline}
            </span>
          </div>
        )}
      </div>

      {/* Main Contributors Breakdown */}
      {Array.isArray(rca.contributingFactors) && rca.contributingFactors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[#69716C] uppercase tracking-wider">
            Main contributors
          </h4>

          <div className="space-y-3">
            {rca.contributingFactors.map((factor, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#202522]">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    {factor.amount && (
                      <span className="text-[#C85C5C] font-mono text-xs">{factor.amount}</span>
                    )}
                    <span className="font-bold text-[#202522] bg-[#F2F4F0] px-2 py-0.5 rounded text-[11px]">
                      {factor.share}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-[#F2F4F0] overflow-hidden">
                  <div
                    className="h-full bg-[#3F8F68] rounded-full"
                    style={{ width: `${Math.min(factor.share, 100)}%` }}
                  />
                </div>

                {factor.reason && (
                  <p className="text-xs text-[#69716C] leading-relaxed">
                    {factor.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Driver */}
      {rca.diagnosis && (
        <div className="p-4 rounded-lg bg-[#F7F8F6] border border-[#E6E9E5]">
          <h4 className="text-xs font-semibold text-[#69716C] uppercase tracking-wider mb-1.5">
            Primary driver
          </h4>
          <p className="text-sm text-[#202522] leading-relaxed font-medium">
            {rca.diagnosis}
          </p>
        </div>
      )}

      {/* Recommended Action */}
      {rca.recommendation && (
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-[#69716C] uppercase tracking-wider mb-1.5">
            Recommended action
          </h4>
          <p className="text-sm text-[#202522] leading-relaxed">
            {rca.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
