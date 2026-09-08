import React from 'react';

const SUGGESTIONS = [
  { label: 'Monthly sales trend', query: 'Show monthly sales trend for the last year.' },
  { label: 'Revenue by category', query: 'Show revenue by category.' },
  { label: 'Total revenue this month', query: 'What is total revenue this month?' },
  { label: 'Employee distribution', query: 'Show employee distribution by department.' },
  { label: 'Why did sales decrease?', query: 'Why did sales decrease last month?' },
  { label: 'Executive dashboard', query: 'Create an executive sales dashboard.' },
];

export default function ExampleQueries({ onSelectPrompt }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
      <span className="text-[#69716C] mr-1">Try asking:</span>
      {SUGGESTIONS.map((item, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectPrompt(item.query)}
          className="px-3 py-1.5 rounded-full bg-white hover:bg-[#F2F4F0] text-[#202522] border border-[#E6E9E5] hover:border-[#D1D5DB] transition-colors font-normal shadow-2xs"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
