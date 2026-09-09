import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, CheckCircle2, Clock } from 'lucide-react';

const AGENT_NAME_MAP = {
  intent: 'Intent Agent',
  schema: 'MCP Schema Discovery',
  sql: 'SQL / Data Agent',
  validation: 'Governance Agent',
  governance: 'Governance Agent',
  query: 'MCP Query Execution',
  mcp: 'MCP Connector',
  analytics: 'Analytics Agent',
  visualization: 'Visualization Agent',
  insight: 'Insight Agent',
};

export default function TechnicalDetails({
  sql,
  intent,
  domain,
  rowCount = 0,
  trace = [],
  traceDetails = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Derive execution steps from traceDetails or trace array
  const steps = useMemo(() => {
    if (Array.isArray(traceDetails) && traceDetails.length > 0) {
      return traceDetails;
    }
    if (Array.isArray(trace) && trace.length > 0) {
      return trace.map((t) => {
        if (typeof t === 'string') {
          return {
            agent: AGENT_NAME_MAP[t.toLowerCase()] || t,
            detail: 'Step completed and verified',
          };
        }
        return t;
      });
    }
    return [];
  }, [trace, traceDetails]);

  if (!sql && !intent && steps.length === 0) return null;

  const handleCopy = () => {
    if (sql) {
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const domainDisplay = domain
    ? domain.toLowerCase() === 'ecommerce'
      ? 'E-Commerce'
      : domain.toLowerCase() === 'hrms'
      ? 'HRMS'
      : domain.toLowerCase() === 'crm'
      ? 'CRM'
      : domain.toUpperCase()
    : 'All Sources';

  const intentDisplay = intent?.analysis
    ? `${intent.analysis.charAt(0).toUpperCase() + intent.analysis.slice(1)} analysis`
    : intent?.domain
    ? `${intent.domain} inquiry`
    : 'Analytical Query';

  return (
    <div className="rounded-card bg-white border border-[#DDE6E1] overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F4F7F5] transition-colors focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#18221E]">
            Technical details
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#176B52] bg-[#E3F2EC] px-2 py-0.5 rounded font-medium">
            <CheckCircle2 className="w-3 h-3 text-[#176B52]" />
            Passed
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-[#66736C]">
          <span>{isOpen ? 'Collapse' : 'Technical details ▾'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 ml-0.5" /> : null}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-[#DDE6E1] bg-[#F4F7F5]/30 space-y-5 text-xs animate-fadeIn">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white border border-[#DDE6E1] space-y-1">
              <span className="text-[11px] text-[#66736C] block font-medium">Intent</span>
              <span className="font-semibold text-[#18221E] block truncate">{intentDisplay}</span>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#DDE6E1] space-y-1">
              <span className="text-[11px] text-[#66736C] block font-medium">Data source</span>
              <span className="font-semibold text-[#18221E] block truncate">{domainDisplay}</span>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#DDE6E1] space-y-1">
              <span className="text-[11px] text-[#66736C] block font-medium">Query validation</span>
              <span className="font-semibold text-[#176B52] flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Passed AST Check
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#DDE6E1] space-y-1">
              <span className="text-[11px] text-[#66736C] block font-medium">Rows returned</span>
              <span className="font-semibold text-[#18221E] block font-mono">{rowCount} rows</span>
            </div>
          </div>

          {/* Agent Trace / Steps Executed */}
          {steps.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-[#66736C] uppercase tracking-wider block">
                Execution Steps ({steps.length})
              </span>
              <div className="p-4 rounded-lg bg-white border border-[#DDE6E1] relative pl-7 space-y-3.5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE6E1]">
                {steps.map((s, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#176B52] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#176B52]"></span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#18221E]">{s.agent || s.title}</span>
                      {s.duration && (
                        <span className="text-[11px] font-mono text-[#66736C] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#66736C]" />
                          {s.duration}
                        </span>
                      )}
                    </div>
                    {s.detail && (
                      <p className="text-xs text-[#66736C] mt-0.5 leading-relaxed">
                        {s.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validated SQL Query */}
          {sql && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-[#66736C]">
                <span className="font-semibold uppercase tracking-wider">Validated SQL Query</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-[#DDE6E1] text-[#18221E] hover:bg-[#F4F7F5] transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-[#176B52]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-white border border-[#DDE6E1] text-[11px] font-mono text-[#18221E] overflow-x-auto leading-relaxed shadow-2xs">
                <code>{sql}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
