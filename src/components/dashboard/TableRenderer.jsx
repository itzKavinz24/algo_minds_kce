import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ArrowUpDown, Search } from 'lucide-react';
import { formatLabel, formatSmartCell } from '../../utils/formatting';

export default function TableRenderer({ title, data = [], emptyMessage = 'No records found' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const columns = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const keySet = new Set();
    data.forEach((row) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => keySet.add(k));
      }
    });
    return Array.from(keySet);
  }, [data]);

  const processedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    let items = [...data];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? '').toLowerCase().includes(q)
        )
      );
    }

    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const comparison = typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB));

        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return items;
  }, [data, searchQuery, sortConfig]);

  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (colKey) => {
    setSortConfig((prev) => {
      if (prev.key === colKey) {
        return {
          key: colKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key: colKey, direction: 'asc' };
    });
  };

  const isNumericCol = (key) => {
    if (!data.length) return false;
    const sample = data.find((r) => r[key] !== null && r[key] !== undefined);
    return sample && typeof sample[key] === 'number';
  };

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-8 rounded-card bg-white border border-[#DDE6E1] text-center text-[#66736C] text-xs">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-card bg-white border border-[#DDE6E1] overflow-hidden flex flex-col shadow-2xs">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-[#DDE6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <h4 className="text-sm font-semibold text-[#18221E]">
            {title || 'Detailed Records'}
          </h4>
          <span className="text-xs text-[#66736C]">
            Showing {processedData.length} total entries
          </span>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-52">
          <Search className="w-3.5 h-3.5 text-[#66736C] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search records..."
            className="w-full bg-[#F4F7F5] border border-[#DDE6E1] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#18221E] placeholder-[#66736C]/60 focus:outline-none focus:border-[#176B52] focus:ring-2 focus:ring-[#176B52]/15 transition-all"
          />
        </div>
      </div>

      {/* Scrollable Table with Sticky Header & Subtle Zebra Rows */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-xs text-[#18221E] border-collapse">
          <thead className="bg-[#F4F7F5] sticky top-0 z-10 border-b border-[#DDE6E1] text-[#66736C] text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              {columns.map((colKey) => {
                const isSorted = sortConfig.key === colKey;
                const isNum = isNumericCol(colKey);
                return (
                  <th
                    key={colKey}
                    onClick={() => handleSort(colKey)}
                    className={`py-2.5 px-4 cursor-pointer hover:text-[#18221E] transition-colors select-none whitespace-nowrap ${
                      isNum ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${isNum ? 'flex-row-reverse' : ''}`}>
                      <span>{formatLabel(colKey)}</span>
                      {isSorted ? (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp className="w-3 h-3 text-[#176B52]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-[#176B52]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-[#66736C]/30" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDE6E1]/60">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-[#66736C] italic">
                  No records match your filter criteria.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => {
                const isZebra = rIdx % 2 === 1;
                return (
                  <tr
                    key={rIdx}
                    className={`transition-colors hover:bg-[#E3F2EC]/40 ${
                      isZebra ? 'bg-[#F4F7F5]/40' : 'bg-white'
                    }`}
                  >
                    {columns.map((colKey) => {
                      const isNum = isNumericCol(colKey);
                      return (
                        <td
                          key={colKey}
                          className={`py-2.5 px-4 whitespace-nowrap text-[#18221E] font-mono text-[11px] ${
                            isNum ? 'text-right' : 'text-left'
                          }`}
                        >
                          {formatSmartCell(colKey, row[colKey])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-[#DDE6E1] bg-[#F4F7F5]/30 flex items-center justify-between text-xs text-[#66736C]">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded bg-white border border-[#DDE6E1] hover:bg-[#EEF3F0] disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded bg-white border border-[#DDE6E1] hover:bg-[#EEF3F0] disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
