import React from 'react';
import Header from './Header';

export default function AppShell({
  children,
  activeTab,
  onNavigate,
  onOpenHistory,
  onResetAnalysis,
  isMockMode,
  setIsMockMode,
  connectedCount,
  hasActiveResult = false,
}) {
  return (
    <div className="min-h-screen bg-[#F4F7F5] text-[#18221E] flex flex-col font-sans">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        onNavigate={onNavigate}
        onOpenHistory={onOpenHistory}
        onResetAnalysis={onResetAnalysis}
        isMockMode={isMockMode}
        setIsMockMode={setIsMockMode}
        connectedCount={connectedCount}
        hasActiveResult={hasActiveResult}
      />

      {/* Main Spacious Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
