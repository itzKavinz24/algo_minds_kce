import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCompactNumber, formatSmartCell } from '../../utils/formatting';

function CustomTooltip({ active, payload, label, yKey, peakItem }) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const isPeak = peakItem && label === peakItem.label;

    return (
      <div className="bg-white border border-[#E6E9E5] p-3 rounded-lg shadow-md text-xs">
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="font-medium text-[#69716C]">{label}</span>
          {isPeak && (
            <span className="text-[10px] font-semibold text-[#3F8F68] bg-[#EAF5EE] px-1.5 py-0.5 rounded">
              Peak
            </span>
          )}
        </div>
        <div className="text-base font-bold text-[#202522] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#3F8F68]"></span>
          <span>{formatSmartCell(yKey, val)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function LineChartComponent({
  data = [],
  x = 'month',
  y = 'revenue',
  color = '#3F8F68',
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-8 text-center text-[#69716C] text-xs">
        No data available to plot
      </div>
    );
  }

  // Find peak point to annotate/highlight
  const peakItem = useMemo(() => {
    if (!data.length) return null;
    let maxVal = -Infinity;
    let maxObj = null;
    data.forEach((d) => {
      const val = Number(d[y] || 0);
      if (val > maxVal) {
        maxVal = val;
        maxObj = { label: d[x], value: val };
      }
    });
    return maxObj;
  }, [data, x, y]);

  const gradientId = `line-gradient-${x}-${y}`;

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F0" vertical={false} />
          <XAxis
            dataKey={x}
            stroke="#69716C"
            tick={{ fill: '#69716C', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E6E9E5' }}
            dy={8}
          />
          <YAxis
            stroke="#69716C"
            tick={{ fill: '#69716C', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => formatCompactNumber(val)}
          />
          <Tooltip content={<CustomTooltip yKey={y} peakItem={peakItem} />} />
          <Area
            type="monotone"
            dataKey={y}
            stroke={color}
            strokeWidth={2.5}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#FFFFFF', stroke: color, strokeWidth: 2.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
