import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatCompactNumber } from '../../utils/formatting';
import { CHART_COLORS } from '../../utils/visualization';

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-white border border-[#DDE6E1] p-2.5 rounded-lg shadow-md text-xs">
        <div className="text-[#66736C] mb-0.5">{item.name}</div>
        <div className="text-sm font-bold text-[#18221E] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload.fill }}></span>
          <span>{formatCompactNumber(item.value)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function PieChartComponent({
  data = [],
  x = 'name',
  y = 'value',
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-8 text-center text-[#66736C] text-xs">
        No distribution data available
      </div>
    );
  }

  const formattedData = data.map((d, idx) => ({
    name: String(d[x] || `Item ${idx + 1}`),
    value: Number(d[y] || 0),
  }));

  const total = formattedData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      {/* Donut Chart with Center Total */}
      <div className="w-full sm:w-1/2 h-64 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2.5}
              dataKey="value"
            >
              {formattedData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xs text-[#66736C] font-medium uppercase tracking-wider">
            Total
          </span>
          <span className="text-xl font-bold text-[#18221E] tracking-tight">
            {formatCompactNumber(total)}
          </span>
        </div>
      </div>

      {/* Clean Legend List */}
      <div className="w-full sm:w-1/2 space-y-2 text-xs">
        {formattedData.map((item, idx) => {
          const share = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          return (
            <div key={idx} className="flex items-center justify-between p-1.5 rounded hover:bg-[#F4F7F5] transition-colors">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                <span className="text-[#18221E] font-medium truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[#66736C] font-mono">{formatCompactNumber(item.value)}</span>
                <span className="text-xs font-semibold text-[#18221E] bg-[#EEF3F0] px-1.5 py-0.5 rounded text-[11px] min-w-[42px] text-right">
                  {share}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
