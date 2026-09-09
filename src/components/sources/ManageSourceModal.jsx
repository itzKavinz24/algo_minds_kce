import React, { useState } from 'react';
import { X, RefreshCw, Activity, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { testDataSourceConnection, refreshDataSourceSchema, disconnectDataSource } from '../../services/dataSourceService';

export default function ManageSourceModal({
  source,
  isOpen,
  onClose,
  onSourceUpdated,
  onSourceDisconnected,
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  if (!isOpen || !source) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testDataSourceConnection(source);
      setTestResult({ success: true, message: res.message || 'Connection verified successfully' });
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshSuccess(false);
    try {
      const updated = await refreshDataSourceSchema(source.id);
      if (onSourceUpdated) onSourceUpdated(updated);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectDataSource(source.id);
      if (onSourceDisconnected) onSourceDisconnected(source.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white border border-[#DDE6E1] rounded-card shadow-xl overflow-hidden p-6 z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#DDE6E1]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#18221E]">
                {source.name}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#EEF3F0] text-[#66736C] border border-[#DDE6E1]">
                {source.type}
              </span>
            </div>
            <p className="text-xs text-[#66736C] mt-1">
              Configuration and connection management
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-btn text-[#66736C] hover:text-[#18221E] hover:bg-[#EEF3F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Specs */}
        <div className="p-4 rounded-lg bg-[#F4F7F5] border border-[#DDE6E1] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#66736C]">Status</span>
            <span className="font-medium text-[#3E9B68] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3E9B68]"></span>
              Connected (Latency: {source.latency || '14ms'})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#66736C]">Host</span>
            <span className="font-mono text-[#18221E]">{source.host || 'localhost'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#66736C]">Port</span>
            <span className="font-mono text-[#18221E]">{source.port || 5432}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#66736C]">Database</span>
            <span className="font-mono font-medium text-[#18221E]">{source.database}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#66736C]">Username</span>
            <span className="font-mono text-[#18221E]">{source.username || 'analytics_user'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#66736C]">Tables Indexed</span>
            <span className="font-medium text-[#18221E]">{source.tables?.length || source.tableCount || 0} tables</span>
          </div>
        </div>

        {/* Actions: Test Connection & Refresh Schema */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-white hover:bg-[#F4F7F5] border border-[#DDE6E1] text-xs font-medium text-[#18221E] transition-colors"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#176B52]" />
                  <span>Testing connection...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-[#176B52]" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-white hover:bg-[#F4F7F5] border border-[#DDE6E1] text-xs font-medium text-[#18221E] transition-colors"
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#66736C]" />
                  <span>Refreshing schema...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#66736C]" />
                  <span>Refresh Schema</span>
                </>
              )}
            </button>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-[#E3F2EC] text-[#176B52] border border-[#176B52]/30'
                  : 'bg-[#FDF2F2] text-[#D76565] border border-[#D76565]/30'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {refreshSuccess && (
            <div className="p-2.5 rounded text-xs bg-[#E3F2EC] text-[#176B52] border border-[#176B52]/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Schema cache updated successfully</span>
            </div>
          )}
        </div>

        {/* Disconnect Section */}
        <div className="pt-4 border-t border-[#DDE6E1]">
          {!confirmDisconnect ? (
            <button
              type="button"
              onClick={() => setConfirmDisconnect(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-white hover:bg-[#FDF2F2]/40 border border-[#DDE6E1] hover:border-[#D76565]/40 text-xs font-medium text-[#D76565] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect Data Source</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-lg bg-[#FDF2F2] border border-[#D76565]/30 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D76565] shrink-0 mt-0.5" />
                <div className="text-xs text-[#18221E]">
                  <strong className="block font-semibold">Disconnect this data source?</strong>
                  <span className="text-[#66736C] text-[11px] leading-relaxed block mt-0.5">
                    Existing analytics queries relying on tables from this database may no longer function.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(false)}
                  className="px-3 py-1.5 rounded-btn bg-white border border-[#DDE6E1] text-xs font-medium text-[#18221E] hover:bg-[#EEF3F0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-3 py-1.5 rounded-btn bg-[#D76565] hover:bg-[#C25454] text-white text-xs font-medium transition-colors"
                >
                  {disconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
