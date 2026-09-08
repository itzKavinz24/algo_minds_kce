import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export default function TechnicalDetails({ sql, intent, domain, rowCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sql && !intent) return null;

  const handleCopy = () => {
    if (sql) {
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-card bg-white border border-[#E6E9E5] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F7F8F6] transition-colors"
      >
        <span className="text-xs font-semibold text-[#202522]">
          Technical details
        </span>
        <div className="flex items-center gap-1.5 text-xs text-[#69716C]">
          <span>{isOpen ? 'Collapse' : 'View SQL'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-[#E6E9E5] bg-[#F7F8F6]/40 space-y-3 text-xs">
          <div className="flex flex-wrap gap-4 text-[#69716C]">
            {domain && (
              <div>
                Source: <strong className="text-[#202522] font-semibold uppercase">{domain}</strong>
              </div>
            )}
            {intent?.analysis && (
              <div>
                Analysis: <strong className="text-[#202522] font-semibold">{intent.analysis}</strong>
              </div>
            )}
            {rowCount > 0 && (
              <div>
                Rows returned: <strong className="text-[#202522] font-semibold">{rowCount}</strong>
              </div>
            )}
          </div>

          {sql && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] text-[#69716C] mb-1.5">
                <span className="font-medium">Validated SQL Query</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[#69716C] hover:text-[#202522] transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-[#4F9D69]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-white border border-[#E6E9E5] text-[11px] font-mono text-[#202522] overflow-x-auto leading-relaxed shadow-2xs">
                <code>{sql}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
