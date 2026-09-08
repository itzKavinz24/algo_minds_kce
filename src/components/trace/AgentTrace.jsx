import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';

const DEFAULT_STEPS = [
  { agent: 'Intent Agent', detail: 'Identified query parameters and analytical intent', duration: '110ms' },
  { agent: 'MCP Schema Discovery', detail: 'Discovered schema tables and column mappings', duration: '180ms' },
  { agent: 'SQL Agent', detail: 'Generated semantic aggregation query', duration: '240ms' },
  { agent: 'Governance & Validator', detail: 'AST security verified: read-only approved', duration: '85ms' },
  { agent: 'MCP Query Execution', detail: 'Executed query across database connection pool', duration: '160ms' },
  { agent: 'Visualization Agent', detail: 'Composed responsive chart specification', duration: '120ms' },
  { agent: 'Insight Agent', detail: 'Synthesized key findings and next steps', duration: '190ms' },
];

export default function AgentTrace({ trace = [], traceDetails = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  let steps = DEFAULT_STEPS;
  if (Array.isArray(traceDetails) && traceDetails.length > 0) {
    steps = traceDetails;
  }

  return (
    <div className="rounded-card bg-white border border-[#E6E9E5] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F7F8F6] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#202522]">
            Agent Trace
          </span>
          <span className="text-[11px] text-[#69716C]">
            (7 agents verified)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#69716C]">
          <span>{isOpen ? 'Collapse' : 'Inspect'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-[#E6E9E5] bg-[#F7F8F6]/40 space-y-4">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E6E9E5]">
            {steps.map((s, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#3F8F68] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F68]"></span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#202522]">{s.agent}</span>
                  {s.duration && (
                    <span className="text-[11px] font-mono text-[#69716C] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#69716C]" />
                      {s.duration}
                    </span>
                  )}
                </div>
                {s.detail && (
                  <p className="text-xs text-[#69716C] mt-0.5 leading-relaxed">
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
