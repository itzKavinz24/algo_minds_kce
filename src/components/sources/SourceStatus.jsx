import React from 'react';
import { Database, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function SourceStatus() {
  const sources = [
    {
      id: 'ecommerce',
      name: 'E-Commerce Core',
      engine: 'PostgreSQL 16',
      status: 'Connected',
      tables: '14 tables (orders, products, items)',
      latency: '12ms',
    },
    {
      id: 'hrms',
      name: 'HRMS People Data',
      engine: 'Snowflake Enterprise',
      status: 'Connected',
      tables: '8 tables (departments, employees)',
      latency: '24ms',
    },
  ];

  return (
    <div className="space-y-2">
      {sources.map((src) => (
        <div
          key={src.id}
          className="p-2.5 rounded-lg bg-white border border-[#DDE6E1] hover:border-[#B9DCCE] transition-colors text-xs"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[#18221E] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3E9B68]"></span>
              {src.name}
            </span>
            <span className="text-[10px] text-[#3E9B68] font-mono flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              {src.latency}
            </span>
          </div>
          <div className="text-[11px] text-[#66736C] font-mono truncate">
            {src.engine}
          </div>
          <div className="text-[10px] text-[#66736C]/80 truncate mt-0.5">
            {src.tables}
          </div>
        </div>
      ))}
    </div>
  );
}
