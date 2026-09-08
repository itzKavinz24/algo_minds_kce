import React, { useState } from 'react';
import { X, Database, Table as TableIcon, Key, Search, ChevronRight } from 'lucide-react';

export default function SchemaViewerModal({ source, isOpen, onClose }) {
  if (!isOpen || !source) return null;

  const tables = source.tables || [];
  const [selectedTableName, setSelectedTableName] = useState(tables[0]?.name || '');
  const [searchTable, setSearchTable] = useState('');

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchTable.toLowerCase().trim())
  );

  const selectedTable = tables.find((t) => t.name === selectedTableName) || tables[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white border border-[#E6E9E5] rounded-card shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-10">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E6E9E5] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F7F8F6] border border-[#E6E9E5] flex items-center justify-center text-[#3F8F68]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#202522]">
                  {source.name}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F2F4F0] text-[#69716C] border border-[#E6E9E5]">
                  {source.type}
                </span>
                <span className="text-xs text-[#4F9D69] font-medium">
                  ● Connected
                </span>
              </div>
              <p className="text-xs text-[#69716C] mt-0.5">
                Database: <span className="font-mono text-[#202522]">{source.database}</span> · {tables.length} tables discovered via MCP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-btn text-[#69716C] hover:text-[#202522] hover:bg-[#F2F4F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: 2 Columns (Tables on Left, Column Schema on Right) */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Left Column: Tables List */}
          <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-[#E6E9E5] bg-[#F7F8F6]/60 flex flex-col">
            <div className="p-3 border-b border-[#E6E9E5]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#69716C] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  placeholder="Filter tables..."
                  className="w-full bg-white border border-[#E6E9E5] rounded-md pl-8 pr-2.5 py-1 text-xs text-[#202522] placeholder-[#69716C]/60 focus:outline-none focus:border-[#3F8F68]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-48 sm:max-h-none">
              {filteredTables.map((tbl) => {
                const isSelected = tbl.name === selectedTableName;
                return (
                  <button
                    key={tbl.name}
                    type="button"
                    onClick={() => setSelectedTableName(tbl.name)}
                    className={`w-full text-left p-2 rounded-md text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-white text-[#202522] font-semibold border border-[#E6E9E5] shadow-2xs'
                        : 'text-[#69716C] hover:text-[#202522] hover:bg-white/60'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <TableIcon className="w-3.5 h-3.5 text-[#3F8F68] shrink-0" />
                      <span className="truncate font-mono">{tbl.name}</span>
                    </span>
                    <span className="text-[10px] text-[#69716C] font-mono">
                      {tbl.columns ? tbl.columns.length : 0} cols
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Column Schema Table */}
          <div className="flex-1 overflow-y-auto p-5 bg-white">
            {selectedTable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E6E9E5]">
                  <div>
                    <h4 className="text-sm font-semibold font-mono text-[#202522]">
                      {selectedTable.name}
                    </h4>
                    {selectedTable.rowCount !== undefined && (
                      <p className="text-xs text-[#69716C]">
                        Approx. {selectedTable.rowCount.toLocaleString()} records indexed
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[#69716C]">
                    {selectedTable.columns?.length || 0} fields
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#202522] border-collapse">
                    <thead className="bg-[#F7F8F6] border-b border-[#E6E9E5] text-[#69716C] text-[11px] font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Column Name</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Key</th>
                        <th className="py-2.5 px-3">Nullable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9E5]/60 font-mono text-[11px]">
                      {selectedTable.columns?.map((col, idx) => (
                        <tr key={idx} className="hover:bg-[#F7F8F6]/40">
                          <td className="py-2.5 px-3 font-semibold text-[#202522]">
                            {col.name}
                          </td>
                          <td className="py-2.5 px-3 text-[#3F8F68]">
                            {col.type}
                          </td>
                          <td className="py-2.5 px-3">
                            {col.key ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  col.key === 'PK'
                                    ? 'bg-[#EAF5EE] text-[#3F8F68] border border-[#3F8F68]/30'
                                    : 'bg-[#F2F4F0] text-[#69716C] border border-[#E6E9E5]'
                                }`}
                              >
                                {col.key}
                              </span>
                            ) : (
                              <span className="text-[#69716C]/40">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[#69716C]">
                            {col.nullable ? 'Yes' : 'No'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#69716C] text-center py-12">
                Select a table to view its columns
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E6E9E5] bg-[#F7F8F6]/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-btn bg-[#202522] hover:bg-[#343A36] text-white text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
