import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCompactNumber, formatSmartCell } from '../../utils/formatting';

function CustomTooltip({ active, payload, label, yKey, isHorizontal }) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const catName = isHorizontal ? payload[0].payload.name : label;

    return (
      <div className="bg-white border border-[#E6E9E5] p-3 rounded-lg shadow-md text-xs">
        <div className="text-[#69716C] mb-1 font-medium">{catName}</div>
        <div className="text-base font-bold text-[#202522] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#3F8F68]"></span>
          <span>{formatSmartCell(yKey, val)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function BarChartComponent({
  data = [],
  x = 'category',
  y = 'revenue',
  color = '#3F8F68',
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-8 text-center text-[#69716C] text-xs">
        No data available to display
      </div>
    );
  }

  // Determine if horizontal layout is superior (long labels or many items)
  const isHorizontal = data.some((d) => String(d[x] || '').length > 7) || data.length > 5;

  const chartData = data.map((d) => ({
    name: String(d[x] || ''),
    value: Number(d[y] || 0),
    ...d,
  }));

  if (isHorizontal) {
    return (
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F0" horizontal={false} />
            <XAxis
              type="number"
              stroke="#69716C"
              tick={{ fill: '#69716C', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#E6E9E5' }}
              tickFormatter={(val) => formatCompactNumber(val)}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#69716C"
              tick={{ fill: '#202522', fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip yKey={y} isHorizontal={true} />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
            <Bar
              dataKey="value"
              fill={color}
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F0" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#69716C"
            tick={{ fill: '#69716C', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E6E9E5' }}
            dy={6}
          />
          <YAxis
            stroke="#69716C"
            tick={{ fill: '#69716C', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => formatCompactNumber(val)}
          />
          <Tooltip content={<CustomTooltip yKey={y} isHorizontal={false} />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
