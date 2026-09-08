/**
 * Utility functions for formatting numbers, currency, dates, and labels.
 */

// Format currency with support for Indian Rupee (Lakhs/Crores) or USD (K/M)
export function formatCurrency(value, currency = 'INR') {
  if (value === null || value === undefined || isNaN(Number(value))) return '-';
  const num = Number(value);

  if (currency === 'INR') {
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 10000000) {
      return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
    }
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(2)}L`;
    }
    if (abs >= 1000) {
      return `${sign}₹${(abs / 1000).toFixed(1)}k`;
    }
    return `${sign}₹${abs.toLocaleString('en-IN')}`;
  }

  // Fallback to international currency formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2,
    notation: num >= 1000000 ? 'compact' : 'standard',
  }).format(num);
}

// Format numbers compactly
export function formatCompactNumber(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return '-';
  const num = Number(value);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `${sign}${(abs / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}${(abs / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000000) {
    return `${sign}${(abs / 1000000).toFixed(2)}M`;
  }
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Format percentage: 0.184 -> 18.4% or 18.4 -> 18.4%
export function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return '-';
  let num = Number(value);
  // If provided as a fraction like 0.184, convert to percentage
  if (Math.abs(num) <= 1 && num !== 0) {
    num = num * 100;
  }
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

// Format readable labels from snake_case or camelCase keys
export function formatLabel(key) {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

// Smart auto-formatter for table cells based on column key and value
export function formatSmartCell(key, value) {
  if (value === null || value === undefined) return '-';
  const lowerKey = (key || '').toLowerCase();

  // Boolean
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Check if string date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
    } catch {
      return value;
    }
  }

  // Numeric checks
  if (typeof value === 'number' || (!isNaN(Number(value)) && typeof value === 'string' && value.trim() !== '')) {
    const num = Number(value);

    // Revenue / Amount / Sales / Cost
    if (lowerKey.includes('revenue') || lowerKey.includes('sales') || lowerKey.includes('amount') || lowerKey.includes('price') || lowerKey.includes('cost') || lowerKey.includes('budget')) {
      return formatCurrency(num);
    }

    // Rate / Margin / Percentage / Share
    if (lowerKey.includes('rate') || lowerKey.includes('margin') || lowerKey.includes('pct') || lowerKey.includes('percent') || lowerKey.includes('growth')) {
      return formatPercentage(num);
    }

    // Count / Quantity / ID
    if (lowerKey.endsWith('_id') || lowerKey === 'id' || lowerKey.includes('year') || lowerKey.includes('code')) {
      return String(value);
    }

    if (Number.isInteger(num)) {
      return num.toLocaleString();
    }

    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return String(value);
}
