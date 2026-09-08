import React from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export default function TraceStep({
  agent,
  status = 'completed',
  duration,
  detail,
}) {
  const isCompleted = status === 'completed';
  const isRunning = status === 'running';
  const isFailed = status === 'failed';

  return (
    <div className="flex items-start gap-3 py-1.5 text-xs">
      <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
        {isCompleted && <Check className="w-3.5 h-3.5 text-[#4F9D69]" />}
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-[#3F8F68] animate-spin" />}
        {isFailed && <AlertCircle className="w-3.5 h-3.5 text-[#C85C5C]" />}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between text-[#202522]">
          <span className="font-medium">{agent}</span>
          {duration && <span className="text-[11px] text-[#69716C] font-mono">{duration}</span>}
        </div>
        {detail && <div className="text-[11px] text-[#69716C] mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}
