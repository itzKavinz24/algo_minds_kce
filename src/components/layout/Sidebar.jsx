import React from 'react';
import { 
  PlusCircle, 
  History, 
  Database, 
  ShieldCheck, 
  Terminal, 
  Sparkles,
  ChevronRight,
  Clock
} from 'lucide-react';
import SourceStatus from '../sources/SourceStatus';

export default function Sidebar({
  isOpen,
  onClose,
  onNewAnalysis,
  recentQueries = [],
  onSelectQuery,
  currentQuery = '',
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:static top-14 bottom-0 left-0 z-40 w-72 bg-white border-r border-[#DDE6E1] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Workspace Action */}
          <div>
            <div className="text-[11px] font-semibold text-[#66736C] uppercase tracking-wider mb-2 px-1">
              Workspace
            </div>
            <button
              type="button"
              onClick={() => {
                onNewAnalysis();
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#E3F2EC] hover:bg-[#D4EBE1] text-[#176B52] border border-[#176B52]/30 text-xs font-medium transition-all group"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#176B52] group-hover:scale-110 transition-transform" />
                <span>New Analysis</span>
              </div>
              <span className="text-[10px] font-mono text-[#176B52] bg-white px-1.5 py-0.5 rounded border border-[#DDE6E1]">
                ⌘K
              </span>
            </button>
          </div>

          {/* Recent Queries */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#66736C] uppercase tracking-wider mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Recent Queries
              </span>
              <span className="text-[10px] font-normal text-[#66736C] font-mono">
                {recentQueries.length}
              </span>
            </div>

            {recentQueries.length === 0 ? (
              <div className="text-xs text-[#66736C] italic px-2 py-3 border border-dashed border-[#DDE6E1] rounded-lg text-center">
                No past queries in session
              </div>
            ) : (
              <div className="space-y-1">
                {recentQueries.map((q, idx) => {
                  const isSelected = q === currentQuery;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSelectQuery(q);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 group ${
                        isSelected
                          ? 'bg-[#E3F2EC] text-[#176B52] border border-[#176B52]/30 font-medium'
                          : 'text-[#66736C] hover:text-[#18221E] hover:bg-[#F4F7F5]'
                      }`}
                    >
                      <Clock className="w-3 h-3 text-[#66736C] group-hover:text-[#18221E] shrink-0" />
                      <span className="truncate flex-1">{q}</span>
                      <ChevronRight className="w-3 h-3 text-[#66736C] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connected Data Sources */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#66736C] uppercase tracking-wider mb-2 px-1">
              <Database className="w-3.5 h-3.5" />
              Connected Sources
            </div>
            <SourceStatus />
          </div>

          {/* System Governance & Security */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#66736C] uppercase tracking-wider mb-2 px-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Governance & Guardrails
            </div>
            <div className="p-2.5 rounded-lg bg-[#F4F7F5] border border-[#DDE6E1] space-y-1.5 text-xs text-[#18221E]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#66736C]">SQL AST Validator</span>
                <span className="text-[#3E9B68] font-mono font-medium">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#66736C]">Read-Only Constraint</span>
                <span className="text-[#3E9B68] font-mono font-medium">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#66736C]">PII Redaction</span>
                <span className="text-[#3E9B68] font-mono font-medium">ON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#DDE6E1] text-[11px] text-[#66736C] flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-[#176B52]" />
            Agentic MCP v1.4
          </span>
          <span className="font-mono text-[10px] text-[#66736C]/70">
            24h Hackathon
          </span>
        </div>
      </aside>
    </>
  );
}
