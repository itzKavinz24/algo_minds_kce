import React from 'react';

const SUGGESTIONS = [
  { label: 'Monthly sales for the last year', query: 'Show monthly sales for the last year' },
  { label: 'Which category generated the most revenue?', query: 'Which product category generated the most revenue?' },
  { label: 'Employees in each department', query: 'How many employees are in each department?' },
  { label: 'Why did sales decrease last month?', query: 'Why did sales decrease last month?' },
  { label: 'Executive sales dashboard', query: 'Create an executive sales dashboard.' },
];

export default function ExampleQueries({ onSelectPrompt }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
      <span className="text-[#66736C] mr-1 text-xs">Examples:</span>
      {SUGGESTIONS.map((item, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectPrompt(item.query)}
          className="px-3 py-1.5 rounded-full bg-[#E3F2EC] hover:bg-[#D4EBE1] text-[#176B52] border border-[#DDE6E1] hover:border-[#CBD5D0] transition-all duration-180 font-medium text-xs shadow-2xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B52]/20"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
