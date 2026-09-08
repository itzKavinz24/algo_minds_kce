import React from 'react';
import { MessageSquare, CornerDownRight, Check } from 'lucide-react';

export default function ConversationHistory({
  turns = [],
  activeTurnIndex,
  onSelectTurn
}) {
  if (!turns || turns.length <= 1) return null;

  return (
    <div className="mb-6 p-3 rounded-xl bg-[#0e1526]/80 border border-[#1e293b] flex items-center gap-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider shrink-0 px-1">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Context Trail:</span>
      </div>

      <div className="flex items-center gap-2">
        {turns.map((turn, idx) => {
          const isActive = idx === activeTurnIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectTurn(idx)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/50 font-medium'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-mono flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="truncate max-w-[180px] sm:max-w-[240px]">
                {turn.query}
              </span>
              {isActive && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
