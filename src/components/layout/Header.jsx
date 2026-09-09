import React from 'react';
import { Database, Clock, Sparkles, Plus } from 'lucide-react';

export default function Header({
  activeTab = 'analytics',
  onNavigate,
  onOpenHistory,
  onResetAnalysis,
  isMockMode,
  setIsMockMode,
  connectedCount = 2,
  hasActiveResult = false,
}) {
  return (
    <header className="border-b border-[#DDE6E1] bg-white sticky top-0 z-30 px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between transition-colors">
      {/* Left Branding & Navigation Tabs */}
      <div className="flex items-center gap-3 sm:gap-6 lg:gap-8">
        <button
          type="button"
          onClick={onResetAnalysis}
          className="flex items-center gap-2.5 text-left group focus-visible:outline-none min-h-[44px] min-w-[44px] shrink-0"
          title="AGENTVERSE Home"
        >
          <div className="w-8 h-8 rounded-lg bg-[#176B52] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-2xs group-hover:bg-[#125641] transition-colors">
            A
          </div>
          <span className="font-bold text-sm sm:text-base tracking-tight text-[#18221E] hidden xs:inline">
            AGENTVERSE
          </span>
        </button>

        {/* Minimal Navigation Tabs */}
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className={`min-h-[40px] px-3 py-1.5 rounded-btn text-xs sm:text-sm transition-all font-medium flex items-center justify-center ${
              activeTab === 'analytics'
                ? 'bg-[#E3F2EC] text-[#176B52] font-semibold shadow-2xs'
                : 'text-[#66736C] hover:text-[#18221E] hover:bg-[#EEF3F0]'
            }`}
          >
            Analytics
          </button>

          <button
            type="button"
            onClick={() => onNavigate('data-sources')}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs sm:text-sm transition-all font-medium justify-center ${
              activeTab === 'data-sources'
                ? 'bg-[#E3F2EC] text-[#176B52] font-semibold shadow-2xs'
                : 'text-[#66736C] hover:text-[#18221E] hover:bg-[#EEF3F0]'
            }`}
          >
            <span>Data Sources</span>
            {connectedCount > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === 'data-sources'
                    ? 'bg-[#176B52] text-white'
                    : 'bg-[#EEF3F0] text-[#66736C]'
                }`}
              >
                {connectedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className="min-h-[40px] flex items-center gap-1 px-3 py-1.5 rounded-btn text-xs sm:text-sm text-[#66736C] hover:text-[#18221E] hover:bg-[#EEF3F0] transition-all font-medium justify-center"
          >
            <span>History</span>
          </button>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {hasActiveResult && (
          <button
            type="button"
            onClick={onResetAnalysis}
            className="min-h-[36px] flex items-center gap-1.5 px-3 py-1 rounded-btn text-xs font-semibold bg-[#E3F2EC] text-[#176B52] hover:bg-[#D5EBDF] transition-colors shadow-2xs"
            title="Start a new analysis question"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New question</span>
          </button>
        )}

        {/* Mock/Live API Switch */}
        <button
          type="button"
          onClick={() => setIsMockMode(!isMockMode)}
          className={`min-h-[36px] text-xs px-2.5 sm:px-3 py-1 rounded-btn font-medium transition-colors border ${
            isMockMode
              ? 'bg-[#E3F2EC] text-[#176B52] border-[#176B52]/30'
              : 'bg-[#EEF3F0] text-[#66736C] border-[#DDE6E1] hover:text-[#18221E]'
          }`}
          title="Toggle between Live API and Demo Dataset"
        >
          {isMockMode ? 'Demo Data' : 'Live API'}
        </button>
      </div>
    </header>
  );
}
