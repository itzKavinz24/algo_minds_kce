import React from 'react';
import Header from './Header';

export default function AppShell({
  children,
  onOpenHistory,
  onResetAnalysis,
  isMockMode,
  setIsMockMode,
  hasActiveResult,
}) {
  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#202522] flex flex-col font-sans">
      {/* Top Header Navigation */}
      <Header
        onOpenHistory={onOpenHistory}
        onResetAnalysis={onResetAnalysis}
        isMockMode={isMockMode}
        setIsMockMode={setIsMockMode}
        hasActiveResult={hasActiveResult}
      />

      {/* Main Spacious Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
