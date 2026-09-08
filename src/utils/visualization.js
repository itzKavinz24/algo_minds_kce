/**
 * Visualization utilities and restrained palette definitions
 */

// Consistent professional enterprise chart palette
export const CHART_COLORS = [
  '#176B52', // Primary Dark Emerald
  '#2FA87A', // Secondary Vibrant Green
  '#72B89D', // Light Mint / Sage
  '#B9DCCE', // Very Light Mint
  '#3E9B68', // Success / Positive
  '#D69A3A', // Warning / Amber
  '#D76565', // Negative / Red
];

/**
 * Validates a visualization specification against available data.
 * Returns { isValid: boolean, reason?: string }
 */
export function validateVisualizationSpec(viz, data) {
  if (!viz) {
    return { isValid: false, reason: 'Missing visualization specification' };
  }

  const type = (viz.type || '').toLowerCase();
  const validTypes = ['line', 'bar', 'pie', 'scatter', 'kpi', 'table', 'area'];

  if (!validTypes.includes(type)) {
    return { isValid: false, reason: `Unsupported chart type: "${viz.type}". Showing table instead.` };
  }

  if (type === 'kpi') {
    if (viz.value !== undefined || (Array.isArray(data) && data.length > 0)) {
      return { isValid: true };
    }
    return { isValid: false, reason: 'No data value found for KPI' };
  }

  if (type === 'table') {
    return { isValid: true };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { isValid: false, reason: 'Data is empty or not in tabular format' };
  }

  const sample = data[0];
  if (viz.x && sample[viz.x] === undefined) {
    return { isValid: false, reason: `Field "${viz.x}" was not found in the response records.` };
  }

  if (viz.y && sample[viz.y] === undefined && !Array.isArray(viz.y)) {
    return { isValid: false, reason: `Field "${viz.y}" was not found in the response records.` };
  }

  return { isValid: true };
}

/**
 * Safely extracts high-level KPIs from backend response
 */
export function extractKPIs(response) {
  const kpis = [];

  if (Array.isArray(response.kpis) && response.kpis.length > 0) {
    return response.kpis;
  }

  if (Array.isArray(response.visualizations)) {
    response.visualizations.forEach((v) => {
      if (v.type === 'kpi') {
        kpis.push({
          title: v.title || v.label || 'Metric',
          value: v.value !== undefined ? v.value : (response.data && response.data[0] ? response.data[0][v.key || v.y || 'value'] : null),
          delta: v.delta || v.change,
          trend: v.trend || (v.delta && String(v.delta).startsWith('-') ? 'down' : 'up'),
          caption: v.caption || v.subtitle,
        });
      }
    });
  }

  if (kpis.length === 0 && Array.isArray(response.data) && response.data.length === 1) {
    const row = response.data[0];
    Object.entries(row).forEach(([key, val]) => {
      if (typeof val === 'number') {
        kpis.push({
          title: key.replace(/_/g, ' ').toUpperCase(),
          value: val,
          key,
        });
      }
    });
  }

  return kpis;
}
