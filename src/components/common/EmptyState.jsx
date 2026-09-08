import React from 'react';
import QueryInput from '../query/QueryInput';
import ExampleQueries from '../query/ExampleQueries';

export default function EmptyState({
  query,
  setQuery,
  onSubmit,
  isLoading,
  onSelectPrompt,
  sources = [],
  selectedSourceId = 'all',
  onSelectSource,
}) {
  const handleChipClick = (promptQuery) => {
    setQuery(promptQuery);
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-10 sm:py-16 flex flex-col items-center text-center animate-fadeIn">
      {/* Hero Section */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#18221E] mb-3">
        Ask your data anything.
      </h1>
      <p className="text-sm sm:text-base text-[#66736C] max-w-lg mb-8 sm:mb-10 leading-relaxed font-normal">
        Turn your business questions into clear insights and visual analytics.
      </p>

      {/* Query Box */}
      <div className="w-full mb-6">
        <QueryInput
          query={query}
          setQuery={setQuery}
          onSubmit={onSubmit}
          isLoading={isLoading}
          placeholder="Ask a question about your business data..."
          autoFocus={true}
          showButton={true}
          buttonLabel="Analyze"
          sources={sources}
          selectedSourceId={selectedSourceId}
          onSelectSource={onSelectSource}
        />
      </div>

      {/* Suggestion Chips */}
      <div className="w-full mb-10">
        <ExampleQueries onSelectPrompt={handleChipClick} />
      </div>

      {/* Compact Connected Data Sources Area */}
      {sources.length > 0 && (
        <div className="pt-4 border-t border-[#DDE6E1]/60 flex flex-wrap items-center justify-center gap-2.5 text-xs">
          <span className="text-[#66736C] font-medium mr-1">Connected sources:</span>
          {sources.map((src) => {
            const isSelected = selectedSourceId === src.id;
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => onSelectSource && onSelectSource(src.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-xs ${
                  isSelected
                    ? 'bg-[#E3F2EC] border-[#176B52]/30 text-[#18221E] font-semibold'
                    : 'bg-white border-[#DDE6E1] hover:border-[#B9DCCE] text-[#18221E]'
                }`}
                title={`Filter to ${src.name}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#3E9B68]"></span>
                <span>{src.name}</span>
                <span className="text-[10px] font-mono text-[#66736C]">({src.type})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
