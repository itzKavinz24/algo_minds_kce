import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { KPISkeleton, ChartSkeleton } from './Skeleton';

const CALM_STAGES = [
  'Understanding your question...',
  'Finding the right data...',
  'Preparing your results...',
  'Creating your visualization...',
];

export default function LoadingState({ query }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < CALM_STAGES.length - 1 ? prev + 1 : prev));
    }, 380);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Query Banner & Stage Card */}
      <div className="bg-white border border-[#DDE6E1] rounded-card p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#DDE6E1]">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-[#176B52] animate-spin shrink-0" />
            <span className="text-xs font-semibold text-[#66736C] uppercase tracking-wider">
              Analyzing your question...
            </span>
          </div>

          <div className="text-xs font-medium text-[#18221E] truncate max-w-md">
            &ldquo;{query}&rdquo;
          </div>
        </div>

        {/* Subtle Horizontal / Step Progress */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {CALM_STAGES.map((text, idx) => {
            const isDone = idx < activeStep;
            const isCurrent = idx === activeStep;

            return (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded-md transition-all ${
                  isCurrent
                    ? 'bg-[#E3F2EC] text-[#18221E] font-semibold'
                    : isDone
                    ? 'text-[#66736C]'
                    : 'text-[#66736C]/40'
                }`}
              >
                <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  {isDone && <Check className="w-3.5 h-3.5 text-[#3E9B68]" />}
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-[#176B52] animate-pulse" />}
                  {!isDone && !isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-[#DDE6E1]" />}
                </div>
                <span className="truncate text-[11px]">{text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle Structural Skeleton Loading View */}
      <div className="space-y-6 opacity-75">
        <KPISkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
