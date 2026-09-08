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
      <div className="bg-white border border-[#E6E9E5] p-2.5 rounded-md shadow-sm text-xs">
        <div className="text-[#202522] font-semibold mb-0.5">{data.name || 'Point'}</div>
        <div className="text-[#69716C]">X: {formatCompactNumber(payload[0].value)}</div>
        {payload[1] && (
          <div className="text-[#69716C]">Y: {formatCompactNumber(payload[1].value)}</div>
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
  color = '#3F8F68',
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-8 rounded-card bg-white border border-[#E6E9E5] text-center text-[#69716C] text-xs">
        No scatter plot data available
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-card bg-white border border-[#E6E9E5] flex flex-col">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6E9E5]">
        <h4 className="text-sm font-semibold text-[#202522]">
          {title || 'Correlation'}
        </h4>
        <span className="text-xs text-[#69716C]">
          Scatter
        </span>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F0" />
            <XAxis
              dataKey={x}
              stroke="#69716C"
              tick={{ fill: '#69716C', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#E6E9E5' }}
              tickFormatter={(val) => formatCompactNumber(val)}
            />
            <YAxis
              dataKey={y}
              stroke="#69716C"
              tick={{ fill: '#69716C', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatCompactNumber(val)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data} fill={color || '#3F8F68'} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
