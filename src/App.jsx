import React, { useState } from 'react';
import AppShell from './components/layout/AppShell';
import HistoryDrawer from './components/layout/HistoryDrawer';
import EmptyState from './components/common/EmptyState';
import LoadingState from './components/common/LoadingState';
import ErrorState from './components/common/ErrorState';
import Dashboard from './components/dashboard/Dashboard';
import { executeQuery } from './services/api';

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

  const runAnalysis = async (queryText) => {
    const targetQuery = (queryText || query).trim();
    if (!targetQuery || isLoading) return;

    setIsLoading(true);
    setError(null);
    setActiveQueryText(targetQuery);

    const context = {
      history: turns.map((t) => ({ query: t.query, intent: t.response?.intent })),
      previousQuery: turns.length > 0 ? turns[turns.length - 1].query : null,
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
  };

  const handleSelectRecentPrompt = (promptText) => {
    setQuery(promptText);
    runAnalysis(promptText);
  };

  return (
    <AppShell
      onOpenHistory={() => setIsHistoryOpen(true)}
      onResetAnalysis={handleResetAnalysis}
      isMockMode={isMockMode}
      setIsMockMode={setIsMockMode}
      hasActiveResult={Boolean(currentResponse)}
    >
      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        recentQueries={recentQueries}
        onSelectQuery={handleSelectRecentPrompt}
      />

      {/* Main Workspace Workflow */}
      {isLoading ? (
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
        />
      )}
    </AppShell>
  );
}
