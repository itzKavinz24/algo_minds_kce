/** Centralized API service for the AgentVerse analytics backend. */

import { getMockResponse } from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 120000;
const SESSION_KEY = 'agentverse_session_id';

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getSessionId() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const created = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}`;
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return 'web-default';
  }
}

export async function executeQuery(query, context = {}, forceMock = false, signal = null) {
  const trimmed = (query || '').trim();
  if (!trimmed) throw new ApiError('Query cannot be empty.', 400);

  const useMockEnv = import.meta.env.VITE_USE_MOCK === 'true';
  if (forceMock || useMockEnv) return simulateMockExecution(trimmed, context);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const endpoint = `${BASE_URL.replace(/\/$/, '')}/api/query`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: trimmed, sessionId: getSessionId() }),
      signal: controller.signal,
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      // A non-JSON error is handled below.
    }

    if (!response.ok) {
      const backendMessage = body?.error?.message || body?.message;
      throw new ApiError(
        backendMessage || `Server returned error status ${response.status}`,
        response.status,
        body
      );
    }

    return normalizeResponse(body, trimmed);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('The live analytics request timed out. No mock data was used.', 503);
    }
    throw new ApiError(
      `The live analytics backend is unavailable at ${BASE_URL}. No mock data was used.`,
      503,
      err.message
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeResponse(res, query) {
  if (!res || typeof res !== 'object') {
    throw new ApiError('Malformed response received from analytics engine.', 502);
  }

  const rows = Array.isArray(res.data) ? res.data : [];
  const trace = Array.isArray(res.trace) ? res.trace : [];
  const insight = res.insight || (rows.length === 0
    ? 'Insufficient data: no records matched the requested criteria.'
    : '');

  return {
    query: res.query || query,
    source: res.source || null,
    sources: Array.isArray(res.sources) ? res.sources : (res.source ? [res.source] : []),
    queries: Array.isArray(res.queries) ? res.queries : [],
    sourceResults: Array.isArray(res.sourceResults) ? res.sourceResults : [],
    sqlRetries: Array.isArray(res.sqlRetries) ? res.sqlRetries : [],
    resultValidation: Array.isArray(res.resultValidation) ? res.resultValidation : [],
    intent: res.intent || { domain: 'enterprise', analysis: 'general', metric: 'value' },
    sql: res.sql || '',
    data: rows,
    visualizations: Array.isArray(res.visualizations) ? res.visualizations : [],
    kpis: Array.isArray(res.kpis) ? res.kpis : [],
    insight,
    answer: res.answer || insight,
    analysisEvidence: res.analysisEvidence || null,
    recommendations: Array.isArray(res.recommendations) ? res.recommendations : [],
    rootCauseAnalysis: res.rootCauseAnalysis || res.rootCause || null,
    trace,
    traceDetails: Array.isArray(res.traceDetails) ? res.traceDetails : [],
    isMock: Boolean(res.isMock),
  };
}

async function simulateMockExecution(query, context = {}) {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const normalized = normalizeResponse(getMockResponse(query), query);
  normalized.isMock = true;
  return normalized;
}
