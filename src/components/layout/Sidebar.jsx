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
        className={`fixed lg:static top-14 bottom-0 left-0 z-40 w-72 bg-[#090d16] border-r border-[#1e293b] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Workspace Action */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Workspace
            </div>
            <button
              type="button"
              onClick={() => {
                onNewAnalysis();
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 text-xs font-medium transition-all group"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>New Analysis</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                ⌘K
              </span>
            </button>
          </div>

          {/* Recent Queries */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Recent Queries
              </span>
              <span className="text-[10px] font-normal text-slate-500 font-mono">
                {recentQueries.length}
              </span>
            </div>

            {recentQueries.length === 0 ? (
              <div className="text-xs text-slate-500 italic px-2 py-3 border border-dashed border-slate-800 rounded-lg text-center">
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
                          ? 'bg-indigo-950/50 text-indigo-200 border border-indigo-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <Clock className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0" />
                      <span className="truncate flex-1">{q}</span>
                      <ChevronRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connected Data Sources */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              <Database className="w-3.5 h-3.5" />
              Connected Sources
            </div>
            <SourceStatus />
          </div>

          {/* System Governance & Security */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Governance & Guardrails
            </div>
            <div className="p-2.5 rounded-lg bg-[#0e1526] border border-[#1e293b] space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center justify-between text-[11px]">
                <span>SQL AST Validator</span>
                <span className="text-emerald-400 font-mono">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Read-Only Constraint</span>
                <span className="text-emerald-400 font-mono">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>PII Redaction</span>
                <span className="text-emerald-400 font-mono">ON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#1e293b] text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-indigo-400" />
            Agentic MCP v1.4
          </span>
          <span className="font-mono text-[10px] text-slate-600">
            24h Hackathon
          </span>
        </div>
      </aside>
    </>
  );
}
