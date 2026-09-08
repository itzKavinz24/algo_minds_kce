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
      <div className="relative w-full max-w-lg bg-white border border-[#E6E9E5] rounded-card shadow-xl overflow-hidden p-6 z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E6E9E5]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#202522]">
                {source.name}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F2F4F0] text-[#69716C] border border-[#E6E9E5]">
                {source.type}
              </span>
            </div>
            <p className="text-xs text-[#69716C] mt-1">
              Configuration and connection management
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-btn text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Specs */}
        <div className="p-4 rounded-lg bg-[#F7F8F6] border border-[#E6E9E5] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#69716C]">Status</span>
            <span className="font-medium text-[#4F9D69] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F9D69]"></span>
              Connected (Latency: {source.latency || '14ms'})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#69716C]">Host</span>
            <span className="font-mono text-[#202522]">{source.host || 'localhost'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#69716C]">Port</span>
            <span className="font-mono text-[#202522]">{source.port || 5432}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#69716C]">Database</span>
            <span className="font-mono font-medium text-[#202522]">{source.database}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#69716C]">Username</span>
            <span className="font-mono text-[#202522]">{source.username || 'analytics_user'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#69716C]">Tables Indexed</span>
            <span className="font-medium text-[#202522]">{source.tables?.length || source.tableCount || 0} tables</span>
          </div>
        </div>

        {/* Actions: Test Connection & Refresh Schema */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-white hover:bg-[#F7F8F6] border border-[#E6E9E5] text-xs font-medium text-[#202522] transition-colors"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3F8F68]" />
                  <span>Testing connection...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-[#3F8F68]" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-white hover:bg-[#F7F8F6] border border-[#E6E9E5] text-xs font-medium text-[#202522] transition-colors"
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#69716C]" />
                  <span>Refreshing schema...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#69716C]" />
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
                  ? 'bg-[#EAF5EE] text-[#3F8F68] border border-[#3F8F68]/30'
                  : 'bg-[#FDECEC] text-[#C85C5C] border border-[#C85C5C]/30'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {refreshSuccess && (
            <div className="p-2.5 rounded text-xs bg-[#EAF5EE] text-[#3F8F68] border border-[#3F8F68]/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Schema cache updated successfully</span>
            </div>
          )}
        </div>

        {/* Disconnect Section */}
        <div className="pt-4 border-t border-[#E6E9E5]">
          {!confirmDisconnect ? (
            <button
              type="button"
              onClick={() => setConfirmDisconnect(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-white hover:bg-[#FDECEC]/40 border border-[#E6E9E5] hover:border-[#C85C5C]/40 text-xs font-medium text-[#C85C5C] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect Data Source</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-lg bg-[#FDF2F2] border border-[#FDE8E8] space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C85C5C] shrink-0 mt-0.5" />
                <div className="text-xs text-[#202522]">
                  <strong className="block font-semibold">Disconnect this data source?</strong>
                  <span className="text-[#69716C] text-[11px] leading-relaxed block mt-0.5">
                    Existing analytics queries relying on tables from this database may no longer function.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(false)}
                  className="px-3 py-1.5 rounded-btn bg-white border border-[#E6E9E5] text-xs font-medium text-[#202522] hover:bg-[#F2F4F0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-3 py-1.5 rounded-btn bg-[#C85C5C] hover:bg-[#B04C4C] text-white text-xs font-medium transition-colors"
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
