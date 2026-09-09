import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCompactNumber } from '../../utils/formatting';

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[#DDE6E1] p-2.5 rounded-md shadow-sm text-xs">
        <div className="text-[#18221E] font-semibold mb-0.5">{data.name || 'Point'}</div>
        <div className="text-[#66736C]">X: {formatCompactNumber(payload[0].value)}</div>
        {payload[1] && (
          <div className="text-[#66736C]">Y: {formatCompactNumber(payload[1].value)}</div>
        )}
      </div>
    );
  }
  return null;
}

export default function ScatterChartComponent({
  title,
  data = [],
  x = 'x',
  y = 'y',
  color = '#176B52',
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-8 rounded-card bg-white border border-[#DDE6E1] text-center text-[#66736C] text-xs">
        No scatter plot data available
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-card bg-white border border-[#DDE6E1] flex flex-col">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DDE6E1]">
        <h4 className="text-sm font-semibold text-[#18221E]">
          {title || 'Correlation'}
        </h4>
        <span className="text-xs text-[#66736C]">
          Scatter
        </span>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F0" />
            <XAxis
              dataKey={x}
              stroke="#66736C"
              tick={{ fill: '#66736C', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#DDE6E1' }}
              tickFormatter={(val) => formatCompactNumber(val)}
            />
            <YAxis
              dataKey={y}
              stroke="#66736C"
              tick={{ fill: '#66736C', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatCompactNumber(val)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data} fill={color || '#176B52'} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
