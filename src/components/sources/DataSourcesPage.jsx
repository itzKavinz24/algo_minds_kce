import React, { useState } from 'react';
import { Plus, Database, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ConnectedSourceCard from './ConnectedSourceCard';
import AddDataSourceModal from './AddDataSourceModal';
import SchemaViewerModal from './SchemaViewerModal';
import ManageSourceModal from './ManageSourceModal';

export default function DataSourcesPage({
  sources = [],
  onSourceAdded,
  onSourceUpdated,
  onSourceDisconnected,
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSchemaSource, setSelectedSchemaSource] = useState(null);
  const [selectedManageSource, setSelectedManageSource] = useState(null);

  const totalTables = sources.reduce(
    (acc, curr) => acc + (curr.tables ? curr.tables.length : curr.tableCount || 0),
    0
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-5 border-b border-[#DDE6E1]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18221E]">
            Data Sources
          </h1>
          <p className="text-sm text-[#66736C] mt-1 font-normal">
            Connect your business databases and make them available for analysis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-[#176B52] hover:bg-[#125641] text-white text-xs font-medium transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Data Source</span>
        </button>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-card bg-white border border-[#DDE6E1] shadow-2xs">
          <div className="text-xs text-[#66736C]">Active Connections</div>
          <div className="text-2xl font-bold text-[#18221E] mt-0.5">
            {sources.length}
          </div>
          <div className="text-[11px] text-[#3E9B68] mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Operational via MCP</span>
          </div>
        </div>

        <div className="p-4 rounded-card bg-white border border-[#DDE6E1] shadow-2xs">
          <div className="text-xs text-[#66736C]">Discovered Schema Tables</div>
          <div className="text-2xl font-bold text-[#18221E] mt-0.5">
            {totalTables}
          </div>
          <div className="text-[11px] text-[#66736C] mt-0.5">
            Indexed across schemas
          </div>
        </div>

        <div className="p-4 rounded-card bg-white border border-[#DDE6E1] shadow-2xs">
          <div className="text-xs text-[#66736C]">Governance & Security</div>
          <div className="text-2xl font-bold text-[#176B52] mt-0.5">
            Enforced
          </div>
          <div className="text-[11px] text-[#66736C] mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#176B52]" />
            <span>Read-only credentials</span>
          </div>
        </div>
      </div>

      {/* Connected Sources List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-[#66736C] uppercase tracking-wider">
            Connected Sources ({sources.length})
          </h2>
          <span className="text-xs text-[#66736C]">
            Ready for SQL Orchestration
          </span>
        </div>

        {sources.length === 0 ? (
          <div className="p-12 text-center rounded-card bg-white border border-[#DDE6E1] space-y-3">
            <Database className="w-8 h-8 text-[#66736C]/40 mx-auto" />
            <h3 className="text-sm font-semibold text-[#18221E]">No databases connected</h3>
            <p className="text-xs text-[#66736C] max-w-sm mx-auto">
              Add a PostgreSQL or MySQL database connection to allow the orchestrator to discover schemas and run queries.
            </p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#176B52] hover:bg-[#125641] text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Database</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((src) => (
              <ConnectedSourceCard
                key={src.id}
                source={src}
                onViewSchema={(s) => setSelectedSchemaSource(s)}
                onManage={(s) => setSelectedManageSource(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Available Sources / Connectors (e.g. CRM - Not connected) */}
      <div className="space-y-3 pt-4 border-t border-[#DDE6E1]">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-[#66736C] uppercase tracking-wider">
            Available Integrations
          </h2>
          <span className="text-xs text-[#66736C]">
            Enterprise connectors
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-card bg-white border border-[#DDE6E1] shadow-2xs hover:border-[#B9DCCE] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#F4F7F5] border border-[#DDE6E1] flex items-center justify-center text-[#66736C] shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#18221E]">
                  CRM (Salesforce / HubSpot)
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#EEF3F0] text-[#66736C] border border-[#DDE6E1]">
                  REST API
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#66736C]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DDE6E1]"></span>
                  Not connected
                </span>
              </div>
              <p className="text-xs text-[#66736C] mt-0.5">
                Connect customer pipeline and deal records to correlate with revenue.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-btn bg-white hover:bg-[#F4F7F5] border border-[#DDE6E1] text-xs font-medium text-[#18221E] transition-colors self-end sm:self-auto shrink-0 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#176B52]" />
            <span>Connect</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AddDataSourceModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSourceAdded={onSourceAdded}
        onViewSchema={(s) => setSelectedSchemaSource(s)}
      />

      <SchemaViewerModal
        isOpen={Boolean(selectedSchemaSource)}
        source={selectedSchemaSource}
        onClose={() => setSelectedSchemaSource(null)}
      />

      <ManageSourceModal
        isOpen={Boolean(selectedManageSource)}
        source={selectedManageSource}
        onClose={() => setSelectedManageSource(null)}
        onSourceUpdated={onSourceUpdated}
        onSourceDisconnected={onSourceDisconnected}
      />
    </div>
  );
}
