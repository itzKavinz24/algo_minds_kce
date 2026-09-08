import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatCurrency, formatCompactNumber, formatLabel } from '../../utils/formatting';

export default function KPICard({ title, value, delta, trend, caption }) {
  const renderFormattedValue = () => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      const lower = (title || '').toLowerCase();
      if (lower.includes('revenue') || lower.includes('sales') || lower.includes('amount') || lower.includes('salary') || lower.includes('price')) {
        return formatCurrency(value);
      }
      return formatCompactNumber(value);
    }
    return String(value);
  };

  const isPositive = trend === 'up' || (delta && String(delta).startsWith('+'));
  const isNegative = trend === 'down' || (delta && String(delta).startsWith('-'));

  return (
    <div className="flex-1 min-w-[160px] p-5 bg-white border border-[#E6E9E5] rounded-card shadow-2xs hover:border-[#D1D5DB] transition-all">
      <div className="text-xs font-medium text-[#69716C] mb-1.5 truncate">
        {formatLabel(title)}
      </div>

      <div className="flex items-baseline gap-2.5 my-0.5">
        <span className="text-2xl sm:text-3xl font-bold text-[#202522] tracking-tight">
          {renderFormattedValue()}
        </span>

        {delta && (
          <span
            className={`inline-flex items-center text-xs font-semibold ${
              isPositive
                ? 'text-[#4F9D69]'
                : isNegative
                ? 'text-[#C85C5C]'
                : 'text-[#69716C]'
            }`}
          >
            {isPositive && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
            {isNegative && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5 mr-0.5" />}
            {delta}
          </span>
        )}
      </div>

      {caption && (
        <div className="text-[11px] text-[#69716C] mt-1.5 truncate">
          {caption}
        </div>
      )}
    </div>
  );
}
