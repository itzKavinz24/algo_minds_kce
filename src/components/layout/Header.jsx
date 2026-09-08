import React from 'react';
import { Database, Clock, Sparkles } from 'lucide-react';

export default function Header({
  activeTab = 'analytics',
  onNavigate,
  onOpenHistory,
  onResetAnalysis,
  isMockMode,
  setIsMockMode,
  connectedCount = 2,
}) {
  return (
    <header className="border-b border-[#E6E9E5] bg-white sticky top-0 z-30 px-4 sm:px-8 h-16 flex items-center justify-between">
      {/* Left Branding & Navigation Tabs */}
      <div className="flex items-center gap-6 sm:gap-8">
        <button
          type="button"
          onClick={onResetAnalysis}
          className="flex items-center gap-2 text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3F8F68] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-2xs group-hover:bg-[#347655] transition-colors">
            A
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-[#202522]">
              AGENTVERSE
            </span>
          </div>
        </button>

        {/* Minimal Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#EAF5EE] text-[#3F8F68] font-semibold'
                : 'text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0]'
            }`}
          >
            Analytics
          </button>

          <button
            type="button"
            onClick={() => onNavigate('data-sources')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-medium transition-all ${
              activeTab === 'data-sources'
                ? 'bg-[#EAF5EE] text-[#3F8F68] font-semibold'
                : 'text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0]'
            }`}
          >
            <span>Data Sources</span>
            {connectedCount > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === 'data-sources'
                    ? 'bg-[#3F8F68] text-white'
                    : 'bg-[#F2F4F0] text-[#69716C]'
                }`}
              >
                {connectedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1 px-3 py-1.5 rounded-btn text-xs font-medium text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0] transition-all"
          >
            <span>History</span>
          </button>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Mock/Live API Switch */}
        <button
          type="button"
          onClick={() => setIsMockMode(!isMockMode)}
          className={`text-[11px] px-2.5 py-1 rounded-btn font-medium transition-colors border ${
            isMockMode
              ? 'bg-[#EAF5EE] text-[#3F8F68] border-[#3F8F68]/30'
              : 'bg-[#F2F4F0] text-[#69716C] border-[#E6E9E5] hover:text-[#202522]'
          }`}
          title="Toggle between Live API and Demo Dataset"
        >
          {isMockMode ? 'Demo Data' : 'Live API'}
        </button>
      </div>
    </header>
  );
}
