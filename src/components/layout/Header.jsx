import React, { useState } from 'react';
import { Database, Clock, Plus, CheckCircle2, ChevronDown } from 'lucide-react';

export default function Header({
  onOpenHistory,
  onResetAnalysis,
  isMockMode,
  setIsMockMode,
  hasActiveResult = false,
}) {
  const [showSourcesPopup, setShowSourcesPopup] = useState(false);

  return (
    <header className="border-b border-[#E6E9E5] bg-white sticky top-0 z-30 px-4 sm:px-8 h-16 flex items-center justify-between">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onResetAnalysis}
          className="flex items-center gap-2 text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3F8F68] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">
            A
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-[#202522]">
              AGENTVERSE
            </span>
            <span className="text-xs text-[#69716C] ml-1.5 font-normal">
              Analytics
            </span>
          </div>
        </button>

        {hasActiveResult && (
          <button
            type="button"
            onClick={onResetAnalysis}
            className="hidden sm:inline-flex items-center gap-1 ml-4 px-2.5 py-1 rounded-btn text-xs text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New question</span>
          </button>
        )}
      </div>

      {/* Right Navigation Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Data Sources Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSourcesPopup(!showSourcesPopup)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-medium text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0] transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[#4F9D69]"></span>
            <span>Data Sources</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#69716C]" />
          </button>

          {showSourcesPopup && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSourcesPopup(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E6E9E5] rounded-card shadow-lg p-3 z-50 animate-fadeIn">
                <div className="text-[11px] font-semibold text-[#69716C] uppercase tracking-wider mb-2">
                  Connected Sources
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-md bg-[#F7F8F6]">
                    <div>
                      <div className="font-medium text-[#202522]">E-Commerce</div>
                      <div className="text-[11px] text-[#69716C]">Orders, Items, Products</div>
                    </div>
                    <span className="text-[10px] text-[#4F9D69] font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-md bg-[#F7F8F6]">
                    <div>
                      <div className="font-medium text-[#202522]">HRMS</div>
                      <div className="text-[11px] text-[#69716C]">Departments, Headcount</div>
                    </div>
                    <span className="text-[10px] text-[#4F9D69] font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* History Toggle */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-medium text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0] transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History</span>
        </button>

        {/* Demo Data Mode Toggle */}
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
