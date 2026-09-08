import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const CALM_STAGES = [
  'Understanding the request',
  'Finding relevant data in sources',
  'Formulating validated SQL query',
  'Preparing analysis and visualization',
];

export default function LoadingState({ query }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < CALM_STAGES.length - 1 ? prev + 1 : prev));
    }, 320);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto py-16 px-4 text-center animate-fadeIn">
      <div className="bg-white border border-[#E6E9E5] rounded-card p-6 shadow-sm text-left">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E6E9E5]">
          <Loader2 className="w-4 h-4 text-[#3F8F68] animate-spin shrink-0" />
          <h3 className="text-sm font-semibold text-[#202522]">
            Analyzing your question...
          </h3>
        </div>

        <div className="space-y-3">
          {CALM_STAGES.map((text, idx) => {
            const isDone = idx < activeStep;
            const isCurrent = idx === activeStep;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 text-xs transition-colors duration-200 ${
                  isCurrent
                    ? 'text-[#202522] font-medium'
                    : isDone
                    ? 'text-[#69716C]'
                    : 'text-[#69716C]/40'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  {isDone && <Check className="w-3.5 h-3.5 text-[#4F9D69]" />}
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-[#3F8F68] animate-pulse" />}
                  {!isDone && !isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />}
                </div>
                <span>{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
