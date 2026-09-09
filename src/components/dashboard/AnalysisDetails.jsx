import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { getAnalysisDetails } from '../../utils/analysisDetails';

export default function AnalysisDetails({ response }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const details = useMemo(() => getAnalysisDetails(response), [response]);

  if (!details) return null;

  const copySql = async () => {
    await navigator.clipboard.writeText(details.sqlQueries.join('\n\n-- Next query --\n\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rows = [
    details.databases.length ? ['Databases used', details.databases.join(' + ')] : null,
    details.tables.length ? ['Tables used', details.tables.join(', ')] : null,
    details.relationships.length ? ['Relationships used', details.relationships.join(', ')] : null,
    details.attempts !== null ? ['SQL attempts', String(details.attempts)] : null,
    details.selfCorrection !== null ? ['Self-correction', details.selfCorrection ? 'Applied' : 'Not required'] : null,
    details.successful !== null ? ['Query execution status', details.successful ? 'Successful' : 'Not successful'] : null,
    details.executionTimeMs !== null ? ['Execution time', `${details.executionTimeMs} ms`] : null,
  ].filter(Boolean);

  return (
    <div className="rounded-card bg-white border border-[#DDE6E1] overflow-hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#F4F7F5] transition-colors focus-visible:outline-none"
      >
        <span className="text-sm font-semibold text-[#18221E]">Analysis Details</span>
        {isOpen
          ? <ChevronUp className="w-4 h-4 shrink-0 text-[#66736C]" />
          : <ChevronDown className="w-4 h-4 shrink-0 text-[#66736C]" />}
      </button>

      {isOpen && (
        <div className="px-4 sm:px-5 py-4 border-t border-[#DDE6E1] bg-[#F4F7F5]/30 space-y-4 animate-fadeIn">
          {rows.length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {rows.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#66736C]">{label}</dt>
                  <dd className="mt-1 text-sm text-[#18221E] break-words flex items-center gap-1.5">
                    {((label === 'Query execution status' && details.successful)
                      || (label === 'Self-correction' && details.selfCorrection))
                      ? <CheckCircle2 className="w-4 h-4 shrink-0 text-[#176B52]" />
                      : null}
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {details.sqlQueries.length > 0 && (
            <div className="pt-1 border-t border-[#DDE6E1]">
              <button
                type="button"
                aria-expanded={showSql}
                onClick={() => setShowSql((value) => !value)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B52] hover:text-[#125641] focus-visible:outline-none"
              >
                {showSql ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showSql ? 'Hide SQL' : 'View SQL'}
              </button>

              {showSql && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={copySql}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-[#DDE6E1] text-xs text-[#18221E] hover:bg-[#F4F7F5]"
                    >
                      {copied ? <Check className="w-3 h-3 text-[#176B52]" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy SQL'}
                    </button>
                  </div>
                  {details.sqlQueries.map((query, index) => (
                    <pre key={index} className="p-3.5 rounded-lg bg-white border border-[#DDE6E1] text-[11px] font-mono text-[#18221E] overflow-x-auto whitespace-pre leading-relaxed">
                      <code>{query}</code>
                    </pre>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
