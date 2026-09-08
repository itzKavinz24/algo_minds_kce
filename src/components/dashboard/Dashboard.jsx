import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import KPIGrid from './KPIGrid';
import ChartRenderer from './ChartRenderer';
import InsightCard from './InsightCard';
import RecommendationCard from './RecommendationCard';
import RootCauseCard from './RootCauseCard';
import TechnicalDetails from './TechnicalDetails';
import TableRenderer from './TableRenderer';
import QueryInput from '../query/QueryInput';
import { extractKPIs } from '../../utils/visualization';
import { formatLabel } from '../../utils/formatting';

export default function Dashboard({
  response,
  onFollowUpQuery,
  isLoadingFollowUp = false,
}) {
  const [followUpText, setFollowUpText] = useState('');
  const [showFullDataTable, setShowFullDataTable] = useState(false);

  if (!response) return null;

  const {
    query,
    intent,
    sql,
    data = [],
    visualizations = [],
    insight,
    recommendations = [],
    rootCauseAnalysis,
    trace = [],
    traceDetails = [],
  } = response;

  const kpis = extractKPIs(response);
  const kpiMetrics = kpis.slice(0, 4); // Business user focus: 3 to 4 metrics max
  const chartVisualizations = visualizations.filter((v) => v.type !== 'kpi');

  // Split into Hero visualization (1st) and Supporting visualizations (rest)
  const heroVisualization = chartVisualizations[0] || null;
  const supportingVisualizations = chartVisualizations.slice(1);

  const handleFollowUpSubmit = () => {
    if (followUpText.trim() && onFollowUpQuery) {
      onFollowUpQuery(followUpText.trim());
      setFollowUpText('');
    }
  };

  // Derive high-level plain-English business takeaway answer
  const answerText = rootCauseAnalysis?.diagnosis || (
    typeof insight === 'string'
      ? insight
      : insight?.summary || insight?.headline || insight?.text || ''
  );

  // Derive readable time context or domain
  const domainLabel = intent?.domain ? formatLabel(intent.domain) : 'Enterprise Data';
  const timeframeLabel = query.toLowerCase().includes('year')
    ? 'January 2026 – December 2026'
    : query.toLowerCase().includes('month')
    ? 'Current billing cycle'
    : 'Historical database records';

  // Contextual quick suggestions for follow-up
  const followUpSuggestions = [
    'Break down by category',
    'Compare with previous period',
    'Show top 5 drivers',
    'What caused this change?'
  ];

  return (
    <div className="space-y-6 sm:space-y-7 animate-slideUp pb-16">
      {/* 1. Query Summary Header & Answer Takeaway */}
      <div className="space-y-4 pb-4 border-b border-[#DDE6E1]">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-[#66736C] uppercase tracking-wider block mb-1">
              Your Question
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#18221E] tracking-tight">
              {query}
            </h2>
            <div className="text-xs text-[#66736C] mt-1 flex items-center gap-2">
              <span>{timeframeLabel}</span>
              <span>·</span>
              <span className="font-medium text-[#18221E]">{domainLabel}</span>
            </div>
          </div>

          <div className="text-xs text-[#66736C] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#176B52]"></span>
            <span>Updated just now</span>
          </div>
        </div>

        {/* High-level Business Takeaway Answer Card */}
        {answerText && (
          <div className="p-4 sm:p-5 rounded-card bg-[#E3F2EC]/60 border border-[#BCE3D3] flex items-start gap-3.5 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-[#176B52] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-semibold text-[#176B52] uppercase tracking-wider block mb-0.5">
                Answer
              </span>
              <p className="text-sm sm:text-base font-medium text-[#18221E] leading-snug">
                {answerText}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Key Numbers (3 to 4 metrics max) */}
      {kpiMetrics.length > 0 && <KPIGrid kpis={kpiMetrics} />}

      {/* 3. Root Cause Analysis (if diagnostic query) */}
      {rootCauseAnalysis && (
        <RootCauseCard
          rca={rootCauseAnalysis}
          onSelectRecommendation={(recText) => setFollowUpText(recText)}
        />
      )}

      {/* 4. Main Hero Visualization */}
      {heroVisualization && (
        <section>
          <ChartRenderer
            visualization={heroVisualization}
            data={data}
            isHero={true}
          />
        </section>
      )}

      {/* 5. Supporting Visualizations Grid (2-column on desktop) */}
      {supportingVisualizations.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {supportingVisualizations.map((viz, idx) => (
            <ChartRenderer
              key={idx}
              visualization={viz}
              data={data}
              isHero={false}
            />
          ))}
        </section>
      )}

      {/* 6. Insight & Next Steps Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightCard insight={insight} />
        <RecommendationCard
          recommendations={recommendations}
          onSelectRecommendation={(recText) => setFollowUpText(recText)}
        />
      </section>

      {/* 7. Detailed Data Table (Expandable / Inline Explorer) */}
      {data.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#18221E]">
              Underlying Data Records
            </h3>
            <button
              type="button"
              onClick={() => setShowFullDataTable(!showFullDataTable)}
              className="text-xs font-medium text-[#176B52] hover:text-[#125641] transition-colors focus-visible:outline-none"
            >
              {showFullDataTable ? 'Hide records' : `View all records (${data.length})`}
            </button>
          </div>

          {showFullDataTable && (
            <div className="pt-1 animate-fadeIn">
              <TableRenderer title="Query Data Records" data={data} />
            </div>
          )}
        </section>
      )}

      {/* 8. Follow-up Question Input with Quick Suggestions */}
      <section className="pt-6 border-t border-[#DDE6E1] space-y-3">
        <div>
          <div className="text-sm font-semibold text-[#18221E]">
            Ask a follow-up question
          </div>
          <p className="text-xs text-[#66736C] mt-0.5">
            Explore deeper or refine this analysis
          </p>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#66736C]">Suggestions:</span>
          {followUpSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setFollowUpText(suggestion)}
              className="px-2.5 py-1 rounded-full bg-white border border-[#DDE6E1] text-xs text-[#18221E] hover:border-[#176B52] hover:text-[#176B52] hover:bg-[#F4F7F5] transition-all focus-visible:outline-none"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <QueryInput
          query={followUpText}
          setQuery={setFollowUpText}
          onSubmit={handleFollowUpSubmit}
          isLoading={isLoadingFollowUp}
          placeholder="Ask a follow-up question..."
          showButton={true}
          buttonLabel="Analyze"
        />
      </section>

      {/* 9. Collapsible Technical Details (SQL, Trace, AST Validation, Domain) at the bottom */}
      <section className="pt-2">
        <TechnicalDetails
          sql={sql}
          intent={intent}
          domain={intent?.domain}
          rowCount={data.length}
          trace={trace}
          traceDetails={traceDetails}
        />
      </section>
    </div>
  );
}
