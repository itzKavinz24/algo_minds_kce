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
}) {
  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#202522] flex flex-col font-sans">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        onNavigate={onNavigate}
        onOpenHistory={onOpenHistory}
        onResetAnalysis={onResetAnalysis}
        isMockMode={isMockMode}
        setIsMockMode={setIsMockMode}
        connectedCount={connectedCount}
      />

      {/* Main Spacious Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
