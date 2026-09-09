import React, { useState } from 'react';
import { AlertCircle, BarChart2, Table as TableIcon } from 'lucide-react';
import LineChartComponent from './LineChart';
import BarChartComponent from './BarChart';
import PieChartComponent from './PieChart';
import ScatterChartComponent from './ScatterChart';
import TableRenderer from './TableRenderer';
import KPICard from './KPICard';
import { validateVisualizationSpec } from '../../utils/visualization';

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-3">
          <div className="p-3 rounded-card bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Visualization unavailable. Showing records as table instead.</span>
          </div>
          <TableRenderer
            title={this.props.title || 'Data Records'}
            data={this.props.data || []}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ChartRenderer({
  visualization,
  data = [],
  isHero = false,
}) {
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'data'

  const chartData = (visualization && Array.isArray(visualization.data) && visualization.data.length > 0)
    ? visualization.data
    : data;

  if (!visualization) {
    return (
      <TableRenderer
        title="Query Records"
        data={chartData}
      />
    );
  }

  const validation = validateVisualizationSpec(visualization, chartData);

  if (!validation.isValid) {
    return (
      <div className="space-y-3">
        <div className="p-3 rounded-card bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validation.reason || 'Showing records as table instead.'}</span>
        </div>
        <TableRenderer
          title={visualization.title || 'Table View'}
          data={chartData}
        />
      </div>
    );
  }

  const type = (visualization.type || '').toLowerCase();
  const title = visualization.title || `${visualization.y || 'Metric'} Performance`;
  const x = visualization.x || Object.keys(chartData[0] || {})[0] || 'x';
  const y = visualization.y || Object.keys(chartData[0] || {})[1] || 'y';
  const color = visualization.color;

  // For KPI single-metric visualizations
  if (type === 'kpi') {
    const kpiVal = visualization.value !== undefined
      ? visualization.value
      : (chartData[0] ? chartData[0][visualization.key || y] : null);

    return (
      <div className="max-w-xs">
        <KPICard
          title={title}
          value={kpiVal}
          delta={visualization.delta}
          trend={visualization.trend}
          caption={visualization.caption}
        />
      </div>
    );
  }

  return (
    <div className={`rounded-card bg-white border border-[#DDE6E1] p-5 sm:p-6 shadow-2xs ${isHero ? 'sm:py-7' : ''}`}>
      {/* Chart Header with Interactive Chart | Data View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#DDE6E1]">
        <div>
          <h3 className={`font-semibold text-[#18221E] tracking-tight ${isHero ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
            {title}
          </h3>
          <p className="text-xs text-[#66736C] mt-0.5">
            {type === 'line' ? 'Monthly performance trend' : type === 'bar' ? 'Comparative metric ranking' : type === 'pie' ? 'Proportional share' : 'Analytical breakdown'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Chart / Data View Switcher */}
          <div className="inline-flex rounded-lg bg-[#EEF3F0] p-0.5 border border-[#DDE6E1]">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'chart'
                  ? 'bg-white text-[#18221E] shadow-2xs'
                  : 'text-[#66736C] hover:text-[#18221E]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('data')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'data'
                  ? 'bg-white text-[#18221E] shadow-2xs'
                  : 'text-[#66736C] hover:text-[#18221E]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas or In-place Tabular Data */}
      <ChartErrorBoundary title={title} data={chartData}>
        {viewMode === 'data' ? (
          <div className="pt-2">
            <TableRenderer title={`${title} Records`} data={chartData} />
          </div>
        ) : (
          (() => {
            switch (type) {
              case 'line':
              case 'area':
                return (
                  <LineChartComponent
                    data={chartData}
                    x={x}
                    y={y}
                    color={color || '#176B52'}
                  />
                );

              case 'bar':
                return (
                  <BarChartComponent
                    data={chartData}
                    x={x}
                    y={y}
                    color={color || '#176B52'}
                  />
                );

              case 'pie':
              case 'donut':
                return (
                  <PieChartComponent
                    data={chartData}
                    x={x}
                    y={y}
                  />
                );

              case 'scatter':
                return (
                  <ScatterChartComponent
                    data={chartData}
                    x={x}
                    y={y}
                    color={color || '#176B52'}
                  />
                );

              case 'table':
              default:
                return (
                  <TableRenderer
                    title={title}
                    data={chartData}
                  />
                );
            }
          })()
        )}
      </ChartErrorBoundary>
    </div>
  );
}
