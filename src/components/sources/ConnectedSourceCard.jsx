import React from 'react';
import { Database, Table, Settings, CheckCircle2 } from 'lucide-react';

export default function ConnectedSourceCard({
  source,
  onViewSchema,
  onManage,
}) {
  return (
    <div className="p-4 sm:p-5 rounded-card bg-white border border-[#DDE6E1] shadow-2xs hover:border-[#B9DCCE] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Source Identity */}
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-[#F4F7F5] border border-[#DDE6E1] flex items-center justify-center text-[#176B52] shrink-0 mt-0.5 sm:mt-0">
          <Database className="w-5 h-5" />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[#18221E]">
              {source.name}
            </h3>
            <span className="text-[11px] font-medium font-mono px-2 py-0.5 rounded bg-[#EEF3F0] text-[#66736C] border border-[#DDE6E1]">
              {source.type}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#176B52]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#176B52]"></span>
              Ready
            </span>
          </div>

          <div className="text-xs text-[#66736C] mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-mono text-[11px] text-[#18221E]">
              db: {source.database}
            </span>
            <span>·</span>
            <span>
              {source.tableCount || (source.tables ? source.tables.length : 0)} tables available
            </span>
            <span>·</span>
            <span>
              Last synced {source.lastChecked || 'just now'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          type="button"
          onClick={() => onViewSchema(source)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#F4F7F5] hover:bg-[#EEF3F0] border border-[#DDE6E1] text-xs font-medium text-[#18221E] transition-colors min-h-[36px]"
        >
          <Table className="w-3.5 h-3.5 text-[#176B52]" />
          <span>Explore Schema</span>
        </button>

        <button
          type="button"
          onClick={() => onManage(source)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-white hover:bg-[#F4F7F5] border border-[#DDE6E1] text-xs font-medium text-[#66736C] hover:text-[#18221E] transition-colors min-h-[36px]"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
