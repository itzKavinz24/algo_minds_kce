import React from 'react';
import { MessageSquare, CornerDownRight, Check } from 'lucide-react';

export default function ConversationHistory({
  turns = [],
  activeTurnIndex,
  onSelectTurn
}) {
  if (!turns || turns.length <= 1) return null;

  return (
    <div className="mb-6 p-3 rounded-xl bg-white border border-[#DDE6E1] shadow-2xs flex items-center gap-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 text-xs text-[#176B52] font-semibold uppercase tracking-wider shrink-0 px-1">
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
                  ? 'bg-[#E3F2EC] text-[#176B52] border-[#176B52]/40 font-semibold'
                  : 'bg-[#F4F7F5] text-[#66736C] hover:text-[#18221E] border-[#DDE6E1] hover:border-[#B9DCCE]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center ${
                isActive ? 'bg-[#176B52] text-white' : 'bg-[#EEF3F0] text-[#66736C]'
              }`}>
                {idx + 1}
              </span>
              <span className="truncate max-w-[180px] sm:max-w-[240px]">
                {turn.query}
              </span>
              {isActive && <Check className="w-3 h-3 text-[#176B52] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
