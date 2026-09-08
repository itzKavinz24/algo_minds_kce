import React from 'react';
import QueryInput from '../query/QueryInput';
import ExampleQueries from '../query/ExampleQueries';

export default function EmptyState({
  query,
  setQuery,
  onSubmit,
  isLoading,
  onSelectPrompt,
}) {
  return (
    <div className="w-full max-w-2xl mx-auto py-12 sm:py-20 flex flex-col items-center text-center animate-fadeIn">
      {/* Friendly Headline */}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#202522] mb-3">
        Ask your data anything
      </h1>
      <p className="text-base text-[#69716C] max-w-lg mb-10 leading-relaxed font-normal">
        Ask a question about your business data and get an instant visual answer without writing SQL.
      </p>

      {/* Query Box */}
      <div className="w-full mb-8">
        <QueryInput
          query={query}
          setQuery={setQuery}
          onSubmit={onSubmit}
          isLoading={isLoading}
          placeholder="What would you like to know? e.g. Show monthly sales trend"
          autoFocus={true}
          showButton={true}
          buttonLabel="Analyze"
        />
      </div>

      {/* Suggestion Chips */}
      <div className="w-full mb-12">
        <ExampleQueries onSelectPrompt={onSelectPrompt} />
      </div>

      {/* Minimal Connected Data Note */}
      <div className="text-xs text-[#69716C] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#4F9D69]"></span>
        <span>Connected to 2 sources · E-Commerce · HRMS</span>
      </div>
    </div>
  );
}
