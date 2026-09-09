const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const unique = (values) => [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];

function durationToMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s)$/i);
  if (!match) return null;
  return Number(match[1]) * (match[2].toLowerCase() === 's' ? 1000 : 1);
}

export function getAnalysisDetails(response) {
  if (!response || typeof response !== 'object') return null;

  const evidence = response.analysisEvidence || {};
  const databases = unique([
    ...asArray(evidence.databasesAccessed),
    ...asArray(response.sources),
    ...(response.source ? [response.source] : []),
  ]);
  const tables = unique(asArray(evidence.tablesAccessed));
  const relationships = unique(asArray(
    evidence.relationshipsUsed || evidence.relationshipsAccessed || response.relationshipsUsed
  ).map((item) => typeof item === 'string' ? item : (
    item.name || item.column || item.relationship || item.key || ''
  )));
  const retries = asArray(response.sqlRetries);
  const executedQueries = asArray(evidence.sqlExecuted);
  const hasExecutedSql = asArray(response.queries).length > 0 || executedQueries.length > 0 || Boolean(response.sql);
  const attempts = hasExecutedSql ? 1 + retries.length : null;
  const validations = asArray(response.resultValidation);
  const successful = validations.length > 0
    ? validations.every((item) => item?.valid === true || String(item?.status || '').startsWith('valid'))
    : null;
  const sqlQueries = unique([
    ...executedQueries.map((item) => typeof item === 'string' ? item : item?.sql),
    ...asArray(response.queries).map((item) => typeof item === 'string' ? item : item?.sql),
    response.sql,
  ].filter(Boolean));
  const durations = asArray(response.traceDetails)
    .map((item) => durationToMs(item?.duration_ms ?? item?.durationMs ?? item?.duration))
    .filter((value) => value !== null);
  const executionTimeMs = durations.length > 0
    ? Math.round(durations.reduce((total, value) => total + value, 0))
    : null;

  const details = {
    databases, tables, relationships, attempts,
    selfCorrection: attempts !== null ? retries.length > 0 : null,
    successful, executionTimeMs, sqlQueries,
  };

  return databases.length || tables.length || relationships.length || attempts !== null
    || successful !== null || executionTimeMs !== null || sqlQueries.length
    ? details
    : null;
}

