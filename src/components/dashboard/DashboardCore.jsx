import React, { useState } from 'react';
import KPIGrid from './KPIGrid';
import ChartRenderer from './ChartRenderer';
import InsightCard from './InsightCard';
import RecommendationCard from './RecommendationCard';
import RootCauseCard from './RootCauseCard';
import TechnicalDetails from './TechnicalDetails';
import TableRenderer from './TableRenderer';
import AgentTrace from '../trace/AgentTrace';
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

  // Derive readable time context or domain
  const domainLabel = intent?.domain ? formatLabel(intent.domain) : 'Enterprise Data';
  const timeframeLabel = query.toLowerCase().includes('year')
    ? 'January 2026 – December 2026'
    : query.toLowerCase().includes('month')
    ? 'Current billing cycle'
    : 'Historical database records';

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* 1. Query Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-5 border-b border-[#E6E9E5]">
        <div>
          <span className="text-[11px] font-semibold text-[#69716C] uppercase tracking-wider block mb-1">
            Analysis
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#202522] tracking-tight">
            {query}
          </h2>
          <div className="text-xs text-[#69716C] mt-1 flex items-center gap-2">
            <span>{timeframeLabel}</span>
            <span>·</span>
            <span className="font-medium text-[#202522]">{domainLabel}</span>
          </div>
        </div>

        <div className="text-xs text-[#69716C] flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#4F9D69]"></span>
          <span>Updated just now</span>
        </div>
      </div>

      {/* 2. KPI / Headline Metrics Row */}
      {kpis.length > 0 && <KPIGrid kpis={kpis} />}

      {/* 3. Root Cause Analysis (if diagnostic query) */}
      {rootCauseAnalysis && (
        <RootCauseCard rca={rootCauseAnalysis} />
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

      {/* 6. Key Insight & Next Steps */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightCard insight={insight} />
        <RecommendationCard recommendations={recommendations} />
      </section>

      {/* 7. Detailed Data Table (Expandable / Inline Explorer) */}
      {data.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#202522]">
              Underlying Data Records
            </h3>
            <button
              type="button"
              onClick={() => setShowFullDataTable(!showFullDataTable)}
              className="text-xs font-medium text-[#3F8F68] hover:text-[#347655] transition-colors"
            >
              {showFullDataTable ? 'Hide table view' : `View all records (${data.length})`}
            </button>
          </div>

          {showFullDataTable && (
            <div className="pt-1">
              <TableRenderer title="Query Data Records" data={data} />
            </div>
          )}
        </section>
      )}

      {/* 8. Collapsible Agent Trace (Tucked below for demonstration) */}
      <section className="pt-4 border-t border-[#E6E9E5]">
        <AgentTrace trace={trace} traceDetails={traceDetails} />
      </section>

      {/* 9. Collapsible Technical Details (SQL, etc.) */}
      <section>
        <TechnicalDetails
          sql={sql}
          intent={intent}
          domain={intent?.domain}
          rowCount={data.length}
        />
      </section>

      {/* 10. Follow-up Question Input */}
      <section className="pt-6 border-t border-[#E6E9E5]">
        <div className="text-sm font-semibold text-[#202522] mb-1">
          What would you like to explore next?
        </div>
        <p className="text-xs text-[#69716C] mb-4">
          Ask a follow-up question to refine this analysis (e.g. &ldquo;Now show only Electronics&rdquo; or &ldquo;Breakdown by department&rdquo;)
        </p>
        <QueryInput
          query={followUpText}
          setQuery={setFollowUpText}
          onSubmit={handleFollowUpSubmit}
          isLoading={isLoadingFollowUp}
          placeholder="Ask a follow-up..."
          showButton={true}
          buttonLabel="Continue"
        />
      </section>
    </div>
  );
}
