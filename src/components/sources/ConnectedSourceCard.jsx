import React from 'react';
import { Database, Table, Settings, CheckCircle2 } from 'lucide-react';

export default function ConnectedSourceCard({
  source,
  onViewSchema,
  onManage,
}) {
  return (
    <div className="p-4 sm:p-5 rounded-card bg-white border border-[#E6E9E5] shadow-2xs hover:border-[#D1D5DB] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Source Identity */}
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-[#F7F8F6] border border-[#E6E9E5] flex items-center justify-center text-[#3F8F68] shrink-0 mt-0.5 sm:mt-0">
          <Database className="w-5 h-5" />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[#202522]">
              {source.name}
            </h3>
            <span className="text-[11px] font-medium font-mono px-2 py-0.5 rounded bg-[#F2F4F0] text-[#69716C] border border-[#E6E9E5]">
              {source.type}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4F9D69]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F9D69]"></span>
              Connected
            </span>
          </div>

          <div className="text-xs text-[#69716C] mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-mono text-[11px] text-[#202522]">
              db: {source.database}
            </span>
            <span>·</span>
            <span>
              {source.tableCount || (source.tables ? source.tables.length : 0)} tables
            </span>
            <span>·</span>
            <span>
              Last checked {source.lastChecked || 'recently'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          type="button"
          onClick={() => onViewSchema(source)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#F7F8F6] hover:bg-[#F2F4F0] border border-[#E6E9E5] text-xs font-medium text-[#202522] transition-colors"
        >
          <Table className="w-3.5 h-3.5 text-[#69716C]" />
          <span>View Schema</span>
        </button>

        <button
          type="button"
          onClick={() => onManage(source)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-white hover:bg-[#F7F8F6] border border-[#E6E9E5] text-xs font-medium text-[#69716C] hover:text-[#202522] transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Manage</span>
        </button>
      </div>
    </div>
  );
}
