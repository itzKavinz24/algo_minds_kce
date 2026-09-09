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

const MAX_RANKED_ITEMS = 15;

function CustomTooltip({ active, payload, label, yKey, isHorizontal }) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const catName = isHorizontal ? payload[0].payload.fullName : label;
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

function shortenLabel(value, maxLength = 22) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function formatDimensionValue(key, value) {
  if (value == null) return '';
  if (/month|date|year|quarter/i.test(key)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
  }
  return String(value);
}
export default function BarChartComponent({
  data = [],
  x = 'category',
  y = 'revenue',
  color = '#3F8F68',
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="p-8 text-center text-[#69716C] text-xs">No data available to display</div>;
  }

  // Preserve both dimensions for grouped results such as category + month.
  // Otherwise valid rows appear as duplicate category labels in the chart.
  const dimensionKeys = Object.keys(data[0] || {}).filter((key) =>
    key !== y && data.some((item) => {
      const value = item[key];
      return value != null && (typeof value === 'string' || value instanceof Date);
    })
  );
  const labelKeys = [x, ...dimensionKeys.filter((key) => key !== x)].slice(0, 2);
  const preparedData = data
    .map((item) => ({
      ...item,
      fullName: labelKeys
        .map((key) => formatDimensionValue(key, item[key]))
        .filter(Boolean)
        .join(' • ') || 'Unknown',
      value: Number(item[y] ?? 0),
    }))
    .filter((item) => Number.isFinite(item.value));

  const isHorizontal = preparedData.some((item) => item.fullName.length > 7) || preparedData.length > 5;
  const chartData = isHorizontal
    ? [...preparedData].sort((a, b) => b.value - a.value).slice(0, MAX_RANKED_ITEMS)
    : preparedData;
  const omittedCount = Math.max(0, preparedData.length - chartData.length);

  if (isHorizontal) {
    const chartHeight = Math.max(320, chartData.length * 36 + 48);
    return (
      <div className="w-full">
        {omittedCount > 0 && (
          <p className="mb-3 text-xs text-[#69716C]">
            Showing the top {chartData.length} of {preparedData.length} results. Open Data for the complete ranking.
          </p>
        )}
        <div className="w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 42, left: 34, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F0" horizontal={false} />
              <XAxis
                type="number"
                stroke="#69716C"
                tick={{ fill: '#69716C', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#E6E9E5' }}
                tickFormatter={formatCompactNumber}
              />
              <YAxis
                type="category"
                dataKey="fullName"
                tick={{ fill: '#202522', fontSize: 12, fontWeight: 500 }}
                tickFormatter={(value) => shortenLabel(value)}
                tickLine={false}
                axisLine={false}
                width={145}
                interval={0}
              />
              <Tooltip content={<CustomTooltip yKey={y} isHorizontal />} cursor={{ fill: 'rgba(63, 143, 104, 0.06)' }} />
              <Bar dataKey="value" fill={color} radius={[0, 5, 5, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F0" vertical={false} />
          <XAxis dataKey="fullName" tick={{ fill: '#69716C', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E6E9E5' }} dy={6} />
          <YAxis tick={{ fill: '#69716C', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={formatCompactNumber} />
          <Tooltip content={<CustomTooltip yKey={y} isHorizontal={false} />} cursor={{ fill: 'rgba(63, 143, 104, 0.06)' }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
