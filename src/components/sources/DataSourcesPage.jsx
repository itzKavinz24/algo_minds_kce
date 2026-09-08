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
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-5 border-b border-[#E6E9E5]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202522]">
            Data Sources
          </h1>
          <p className="text-sm text-[#69716C] mt-1 font-normal">
            Connect your business databases and make them available for analysis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-[#3F8F68] hover:bg-[#347655] text-white text-xs font-medium transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Data Source</span>
        </button>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-card bg-white border border-[#E6E9E5] shadow-2xs">
          <div className="text-xs text-[#69716C]">Active Connections</div>
          <div className="text-2xl font-bold text-[#202522] mt-0.5">
            {sources.length}
          </div>
          <div className="text-[11px] text-[#4F9D69] mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Operational via MCP</span>
          </div>
        </div>

        <div className="p-4 rounded-card bg-white border border-[#E6E9E5] shadow-2xs">
          <div className="text-xs text-[#69716C]">Discovered Schema Tables</div>
          <div className="text-2xl font-bold text-[#202522] mt-0.5">
            {totalTables}
          </div>
          <div className="text-[11px] text-[#69716C] mt-0.5">
            Indexed across schemas
          </div>
        </div>

        <div className="p-4 rounded-card bg-white border border-[#E6E9E5] shadow-2xs">
          <div className="text-xs text-[#69716C]">Governance & Security</div>
          <div className="text-2xl font-bold text-[#3F8F68] mt-0.5">
            Enforced
          </div>
          <div className="text-[11px] text-[#69716C] mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3F8F68]" />
            <span>Read-only credentials</span>
          </div>
        </div>
      </div>

      {/* Connected Sources List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-[#69716C] uppercase tracking-wider">
            Connected Databases ({sources.length})
          </h2>
          <span className="text-xs text-[#69716C]">
            Ready for SQL Orchestration
          </span>
        </div>

        {sources.length === 0 ? (
          <div className="p-12 text-center rounded-card bg-white border border-[#E6E9E5] space-y-3">
            <Database className="w-8 h-8 text-[#69716C]/40 mx-auto" />
            <h3 className="text-sm font-semibold text-[#202522]">No databases connected</h3>
            <p className="text-xs text-[#69716C] max-w-sm mx-auto">
              Add a PostgreSQL or MySQL database connection to allow the orchestrator to discover schemas and run queries.
            </p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#3F8F68] text-white text-xs font-medium"
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
