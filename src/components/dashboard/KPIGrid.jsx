import React from 'react';
import KPICard from './KPICard';

export default function KPIGrid({ kpis = [] }) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div
      className={`grid gap-3 sm:gap-4 ${
        kpis.length === 1
          ? 'grid-cols-1 max-w-xs'
          : kpis.length === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : kpis.length === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
      }`}
    >
      {kpis.map((kpi, idx) => (
        <KPICard
          key={idx}
          title={kpi.title || kpi.name || kpi.label}
          value={kpi.value}
          delta={kpi.delta || kpi.change}
          trend={kpi.trend}
          caption={kpi.caption || kpi.subtitle}
        />
      ))}
    </div>
  );
}
