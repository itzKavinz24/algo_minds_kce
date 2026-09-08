import React, { useState } from 'react';
import AppShell from './components/layout/AppShell';
import HistoryDrawer from './components/layout/HistoryDrawer';
import EmptyState from './components/common/EmptyState';
import LoadingState from './components/common/LoadingState';
import ErrorState from './components/common/ErrorState';
import Dashboard from './components/dashboard/Dashboard';
import DataSourcesPage from './components/sources/DataSourcesPage';
import { executeQuery } from './services/api';
import { getStoredDataSourcesSync } from './services/dataSourceService';

const DEFAULT_RECENT = [
  "Show monthly sales trend for the last year.",
  "Show revenue by category.",
  "What is total revenue this month?",
  "Show employee distribution by department.",
  "Why did sales decrease last month?",
  "Create an executive sales dashboard."
];

export default function App() {
  const [query, setQuery] = useState('');
  const [activeQueryText, setActiveQueryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Navigation tab: 'analytics' | 'data-sources'
  const [activeTab, setActiveTab] = useState('analytics');

  // Connected data sources state
  const [sources, setSources] = useState(getStoredDataSourcesSync);
  const [selectedSourceId, setSelectedSourceId] = useState('all');

  // Turns and active response
  const [turns, setTurns] = useState([]);
  const [activeTurnIndex, setActiveTurnIndex] = useState(-1);

  // Settings & Navigation
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [recentQueries, setRecentQueries] = useState(() => {
    try {
      const saved = localStorage.getItem('agentverse_recent');
      return saved ? JSON.parse(saved) : DEFAULT_RECENT;
    } catch {
      return DEFAULT_RECENT;
    }
  });

  const currentResponse = activeTurnIndex >= 0 && turns[activeTurnIndex]
    ? turns[activeTurnIndex].response
    : null;

  const addRecentQuery = (newQ) => {
    setRecentQueries((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== newQ.toLowerCase());
      const updated = [newQ, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('agentverse_recent', JSON.stringify(updated));
      } catch {
        // Storage not available
      }
      return updated;
    });
  };

  const handleSourceAdded = (newSource) => {
    setSources((prev) => [newSource, ...prev]);
  };

  const handleSourceUpdated = (updatedSource) => {
    setSources((prev) =>
      prev.map((s) => (s.id === updatedSource.id ? updatedSource : s))
    );
  };

  const handleSourceDisconnected = (sourceId) => {
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
    if (selectedSourceId === sourceId) {
      setSelectedSourceId('all');
    }
  };

  const runAnalysis = async (queryText) => {
    const targetQuery = (queryText || query).trim();
    if (!targetQuery || isLoading) return;

    setIsLoading(true);
    setError(null);
    setActiveQueryText(targetQuery);

    const selectedSource = sources.find((s) => s.id === selectedSourceId);
    const context = {
      history: turns.map((t) => ({ query: t.query, intent: t.response?.intent })),
      previousQuery: turns.length > 0 ? turns[turns.length - 1].query : null,
      dataSourceId: selectedSourceId,
      dataSourceName: selectedSource ? selectedSource.name : 'all',
      dataSourceType: selectedSource ? selectedSource.type : null,
    };

    try {
      const response = await executeQuery(targetQuery, context, isMockMode);
      
      const newTurn = {
        query: targetQuery,
        response,
        timestamp: new Date().toISOString(),
      };

      setTurns((prev) => [...prev, newTurn]);
      setActiveTurnIndex(turns.length);
      addRecentQuery(targetQuery);
      setQuery('');
      setActiveTab('analytics');
    } catch (err) {
      console.error('[Analysis Error]', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAnalysis = () => {
    setTurns([]);
    setActiveTurnIndex(-1);
    setQuery('');
    setError(null);
    setIsLoading(false);
    setActiveTab('analytics');
  };

  const handleSelectRecentPrompt = (promptText) => {
    setActiveTab('analytics');
    setQuery(promptText);
    runAnalysis(promptText);
  };

  return (
    <AppShell
      activeTab={activeTab}
      onNavigate={(tab) => setActiveTab(tab)}
      onOpenHistory={() => setIsHistoryOpen(true)}
      onResetAnalysis={handleResetAnalysis}
      isMockMode={isMockMode}
      setIsMockMode={setIsMockMode}
      connectedCount={sources.length}
      hasActiveResult={Boolean(currentResponse)}
    >
      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        recentQueries={recentQueries}
        onSelectQuery={handleSelectRecentPrompt}
      />

      {/* Main Workspace: Data Sources OR Analytics Workflow */}
      {activeTab === 'data-sources' ? (
        <DataSourcesPage
          sources={sources}
          onSourceAdded={handleSourceAdded}
          onSourceUpdated={handleSourceUpdated}
          onSourceDisconnected={handleSourceDisconnected}
        />
      ) : isLoading ? (
        <LoadingState query={activeQueryText || query} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => runAnalysis(activeQueryText)} />
      ) : currentResponse ? (
        <Dashboard
          response={currentResponse}
          onFollowUpQuery={(followUp) => runAnalysis(followUp)}
          isLoadingFollowUp={isLoading}
        />
      ) : (
        <EmptyState
          query={query}
          setQuery={setQuery}
          onSubmit={() => runAnalysis(query)}
          isLoading={isLoading}
          onSelectPrompt={handleSelectRecentPrompt}
          sources={sources}
          selectedSourceId={selectedSourceId}
          onSelectSource={setSelectedSourceId}
        />
      )}
    </AppShell>
  );
}
