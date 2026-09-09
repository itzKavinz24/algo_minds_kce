import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, Loader2, ArrowRight, Table } from 'lucide-react';
import { testDataSourceConnection, connectDataSource } from '../../services/dataSourceService';

const DATABASE_TYPES = [
  { id: 'PostgreSQL', name: 'PostgreSQL', defaultPort: 5432, status: 'active', desc: 'Enterprise relational database' },
  { id: 'MySQL', name: 'MySQL', defaultPort: 3306, status: 'active', desc: 'Standard relational database' },
  { id: 'Snowflake', name: 'Snowflake', status: 'coming_soon', desc: 'Cloud data warehouse' },
  { id: 'SQLServer', name: 'SQL Server', status: 'coming_soon', desc: 'Microsoft SQL Server' },
  { id: 'MongoDB', name: 'MongoDB', status: 'coming_soon', desc: 'Document store' },
  { id: 'CRM', name: 'Salesforce / HubSpot', status: 'coming_soon', desc: 'CRM connector' },
];

export default function AddDataSourceModal({
  isOpen,
  onClose,
  onSourceAdded,
  onViewSchema,
}) {
  const [selectedType, setSelectedType] = useState('PostgreSQL');
  const [formData, setFormData] = useState({
    name: 'Production Analytics DB',
    host: 'db.internal.company.com',
    port: 5432,
    database: 'analytics_db',
    username: 'readonly_user',
    password: '',
    ssl: true,
  });

  // State machine: 'form' | 'success'
  const [step, setStep] = useState('form');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { success: boolean, message: string }
  const [connecting, setConnecting] = useState(false);
  const [newlyConnectedSource, setNewlyConnectedSource] = useState(null);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleTypeSelect = (typeObj) => {
    if (typeObj.status === 'coming_soon') return;
    setSelectedType(typeObj.id);
    setFormData((prev) => ({
      ...prev,
      port: typeObj.defaultPort || prev.port,
    }));
    setTestStatus(null);
  };

  const handleTestConnection = async () => {
    if (!formData.host || !formData.database || !formData.username) {
      setFormError('Please fill in host, database name, and username.');
      return;
    }

    setFormError('');
    setTesting(true);
    setTestStatus(null);

    try {
      const res = await testDataSourceConnection({
        ...formData,
        type: selectedType,
      });
      setTestStatus({ success: true, message: res.message || '✓ Connection verified successfully' });
    } catch (err) {
      setTestStatus({ success: false, message: err.message || 'Connection test failed. Check host and credentials.' });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!formData.host || !formData.database || !formData.username) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setConnecting(true);
    setFormError('');

    try {
      const createdSource = await connectDataSource({
        ...formData,
        type: selectedType,
      });

      setNewlyConnectedSource(createdSource);
      if (onSourceAdded) {
        onSourceAdded(createdSource);
      }
      setStep('success');
    } catch (err) {
      setFormError(err.message || 'Failed to establish connection to database.');
    } finally {
      setConnecting(false);
    }
  };

  const handleCloseAll = () => {
    setStep('form');
    setTestStatus(null);
    setFormError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-xs transition-opacity"
        onClick={handleCloseAll}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-white border border-[#DDE6E1] rounded-card shadow-xl overflow-hidden z-10">
        {step === 'form' ? (
          <div>
            {/* Header */}
            <div className="p-5 border-b border-[#DDE6E1] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#18221E]">
                  Connect a data source
                </h3>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Choose the database or enterprise system you want to connect.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseAll}
                className="p-1.5 rounded-btn text-[#66736C] hover:text-[#18221E] hover:bg-[#EEF3F0] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnect} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* 1. Database Type Picker */}
              <div>
                <label className="text-xs font-semibold text-[#18221E] uppercase tracking-wider block mb-2">
                  1. Supported Source
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DATABASE_TYPES.map((dt) => {
                    const isSelected = selectedType === dt.id;
                    const isAvailable = dt.status === 'active';

                    return (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => handleTypeSelect(dt)}
                        disabled={!isAvailable}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-[#176B52] bg-[#E3F2EC]/40 text-[#18221E] shadow-2xs'
                            : isAvailable
                            ? 'border-[#DDE6E1] bg-white hover:border-[#B9DCCE] text-[#18221E]'
                            : 'border-[#DDE6E1]/60 bg-[#F4F7F5] text-[#66736C]/60 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold">{dt.name}</span>
                          {!isAvailable && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#DDE6E1] text-[#66736C]">
                              Soon
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#66736C] block truncate">
                          {dt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Connection Details Form */}
              <div className="space-y-4">
                <label className="text-xs font-semibold text-[#18221E] uppercase tracking-wider block mb-2">
                  2. Connection Parameters
                </label>

                <div>
                  <label className="text-xs font-medium text-[#18221E] block mb-1">
                    Connection Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sales Production Cluster"
                    className="w-full bg-[#F4F7F5] border border-[#DDE6E1] rounded-md px-3 py-2 text-xs text-[#18221E] focus:outline-none focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/15 transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-[#18221E] block mb-1">
                      Host
                    </label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="db.company.internal"
                      className="w-full bg-[#F4F7F5] border border-[#DDE6E1] rounded-md px-3 py-2 text-xs font-mono text-[#18221E] focus:outline-none focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#18221E] block mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="w-full bg-[#F4F7F5] border border-[#DDE6E1] rounded-md px-3 py-2 text-xs font-mono text-[#18221E] focus:outline-none focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#18221E] block mb-1">
                    Database Name
                  </label>
                  <input
                    type="text"
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    placeholder="e.g. analytics_db"
                    className="w-full bg-[#F4F7F5] border border-[#DDE6E1] rounded-md px-3 py-2 text-xs font-mono text-[#18221E] focus:outline-none focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/15 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#18221E] block mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="readonly_user"
                      className="w-full bg-[#F4F7F5] border border-[#DDE6E1] rounded-md px-3 py-2 text-xs font-mono text-[#18221E] focus:outline-none focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#18221E] block mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-[#F4F7F5] border border-[#DDE6E1] rounded-md px-3 py-2 text-xs font-mono text-[#18221E] focus:outline-none focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/15 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="ssl_toggle"
                    checked={formData.ssl}
                    onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                    className="w-4 h-4 rounded text-[#176B52] focus:ring-[#176B52]"
                  />
                  <label htmlFor="ssl_toggle" className="text-xs text-[#66736C] cursor-pointer">
                    Enable SSL / TLS connection verification
                  </label>
                </div>
              </div>

              {/* Feedback messages */}
              {formError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#D76565]/30 text-xs text-[#D76565] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {testStatus && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    testStatus.success
                      ? 'bg-[#E3F2EC] text-[#176B52] border border-[#176B52]/30'
                      : 'bg-[#FDF2F2] text-[#D76565] border border-[#D76565]/30'
                  }`}
                >
                  {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testStatus.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#DDE6E1] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 rounded-btn bg-[#F4F7F5] hover:bg-[#EEF3F0] border border-[#DDE6E1] text-xs font-medium text-[#18221E] transition-colors"
                >
                  {testing ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#176B52]" />
                      Testing connection...
                    </span>
                  ) : (
                    'Test Connection'
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseAll}
                    className="px-3 py-2 rounded-btn text-xs font-medium text-[#66736C] hover:text-[#18221E]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={connecting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-btn bg-[#176B52] hover:bg-[#125641] text-white text-xs font-medium transition-colors shadow-2xs"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting & Discovering...</span>
                      </>
                    ) : (
                      <>
                        <span>Connect Database</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* Step: Success Screen */
          <div className="p-6 text-center space-y-6 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-[#E3F2EC] text-[#176B52] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#18221E]">
                Database Connected Successfully
              </h3>
              <p className="text-xs text-[#66736C] mt-1">
                {newlyConnectedSource?.type} · {newlyConnectedSource?.name} · {newlyConnectedSource?.tables?.length || 0} tables discovered via MCP
              </p>
            </div>

            {/* Schema preview chips */}
            {newlyConnectedSource?.tables && (
              <div className="p-4 rounded-lg bg-[#F4F7F5] border border-[#DDE6E1] text-left">
                <span className="text-[11px] font-semibold text-[#66736C] uppercase tracking-wider block mb-2">
                  Discovered Tables
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {newlyConnectedSource.tables.map((tbl) => (
                    <span
                      key={tbl.name}
                      className="px-2 py-1 rounded bg-white border border-[#DDE6E1] text-xs font-mono text-[#18221E] flex items-center gap-1"
                    >
                      <Table className="w-3 h-3 text-[#176B52]" />
                      {tbl.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              {onViewSchema && (
                <button
                  type="button"
                  onClick={() => {
                    handleCloseAll();
                    onViewSchema(newlyConnectedSource);
                  }}
                  className="px-4 py-2 rounded-btn bg-[#F4F7F5] hover:bg-[#EEF3F0] border border-[#DDE6E1] text-xs font-medium text-[#18221E] transition-colors"
                >
                  View Full Schema
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseAll}
                className="px-6 py-2 rounded-btn bg-[#176B52] hover:bg-[#125641] text-white text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
