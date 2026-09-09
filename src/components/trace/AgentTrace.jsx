import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';

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

export default function AgentTrace({ trace = [], traceDetails = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Derive steps only from actual backend data
  const steps = React.useMemo(() => {
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

  if (steps.length === 0) return null;

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
          <span className="text-[11px] text-[#66736C]">
            ({steps.length} steps executed)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#66736C]">
          <span>{isOpen ? 'Collapse' : 'Inspect'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-[#DDE6E1] bg-[#F4F7F5]/30 space-y-4 animate-fadeIn">
          <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE6E1]">
            {steps.map((s, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#3E9B68] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3E9B68]"></span>
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
    </div>
  );
}
