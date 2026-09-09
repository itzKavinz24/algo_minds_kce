import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

const REPORT_API_URL = import.meta.env.VITE_REPORT_API_URL || 'http://localhost:8001';

function buildAnalysisResult(response) {
  const rows = Array.isArray(response.data) ? response.data : [];
  const analytics = response.analytics || {};
  const summary = response.insight || analytics.summary || 'No analytical summary was available.';
  const findings = analytics.key_findings || analytics.keyFindings || [summary];
  return {
    business_question: response.query || 'Analytics report',
    data_source: { id: response.source || 'enterprise_db', engine: 'PostgreSQL', schema: 'public', name: response.source || 'Enterprise Database' },
    tables_used: response.sql?.match(/(?:FROM|JOIN)\s+([a-zA-Z_][\w.]*)/gi)?.map((entry) => entry.split(/\s+/)[1]) || [],
    sql: response.sql || '',
    query_result: {
      columns: rows[0] ? Object.keys(rows[0]).map((name) => ({ name, data_type: typeof rows[0][name] === 'number' ? 'numeric' : 'text' })) : [],
      rows,
      row_count: rows.length,
    },
    analysis: {
      summary,
      key_findings: Array.isArray(findings) ? findings : [String(findings)],
      recommendations: Array.isArray(response.recommendations) ? response.recommendations : [],
      data_quality_and_limitations: rows.length ? [`Based on ${rows.length} returned database row(s).`] : ['No database records matched the criteria.'],
    },
    metadata: { generated_at: new Date().toISOString(), truncated: rows.length >= 500, total_source_rows: rows.length },
  };
}

export default function ReportDownloadButton({ response }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const created = await fetch(`${REPORT_API_URL}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_result: buildAnalysisResult(response) }),
      });
      const report = await created.json().catch(() => ({}));
      if (!created.ok) throw new Error(report.detail || 'Report generation failed.');
      const downloaded = await fetch(`${REPORT_API_URL}/reports/${encodeURIComponent(report.report_id)}/download`);
      if (!downloaded.ok) throw new Error('Generated PDF download failed.');
      const url = URL.createObjectURL(await downloaded.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${report.report_id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (exception) {
      setError(exception.message || 'Unable to generate the PDF report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={download} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn bg-white border border-[#DDE6E1] text-xs font-semibold text-[#176B52] hover:bg-[#E3F2EC] disabled:opacity-60">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        {busy ? 'Generating PDF...' : 'Download PDF Report'}
      </button>
      {error && <span className="text-[11px] text-red-600 max-w-xs text-right">{error}</span>}
    </div>
  );
}
