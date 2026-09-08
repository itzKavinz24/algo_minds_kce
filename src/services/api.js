/**
 * Centralized API Service for AGENTVERSE.
 * Handles POST /api/query communication, timeouts, error recovery,
 * and transparent fallback to high-fidelity mock data during development/demo.
 */

import { getMockResponse } from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Execute an analytics query through the Orchestrator backend
 * @param {string} query - Natural language question
 * @param {object} context - Prior conversation / session context
 * @param {boolean} forceMock - Explicit flag to force mock dataset
 * @param {AbortSignal} signal - Optional abort signal
 */
export async function executeQuery(query, context = {}, forceMock = false, signal = null) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    throw new ApiError('Query cannot be empty.', 400);
  }

  // If mock mode is explicitly requested or set via environment
  const useMockEnv = import.meta.env.VITE_USE_MOCK === 'true';
  if (forceMock || useMockEnv) {
    return simulateMockExecution(trimmed, context);
  }

  // Attempt live request to backend
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  // Link caller signal if passed
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const endpoint = `${BASE_URL.replace(/\/$/, '')}/api/query`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: trimmed,
        context: context || {},
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch {
        // Non-JSON response
      }
      throw new ApiError(
        (errorBody && errorBody.message) || `Server returned error status ${response.status}`,
        response.status,
        errorBody
      );
    }

    const data = await response.json();
    return normalizeResponse(data, trimmed);
  } catch (err) {
    clearTimeout(timeoutId);

    // If fetch failed due to offline backend / connection refused, fallback gracefully to mock demo dataset
    if (err.name === 'AbortError' || err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
      console.warn(`[AGENTVERSE API] Live backend unavailable at ${BASE_URL}. Falling back to demo mock dataset.`);
      return simulateMockExecution(trimmed, context, true);
    }

    // Rethrow standard ApiError
    throw new ApiError(err.message || 'Unable to connect to the analytics engine.', err.status || 500);
  }
}

/**
 * Normalizes backend response structure to guarantee UI stability
 */
function normalizeResponse(res, query) {
  if (!res || typeof res !== 'object') {
    throw new ApiError('Malformed response received from analytics engine.', 502);
  }

  return {
    query: res.query || query,
    intent: res.intent || { domain: 'enterprise', analysis: 'general', metric: 'value' },
    sql: res.sql || '',
    data: Array.isArray(res.data) ? res.data : [],
    visualizations: Array.isArray(res.visualizations) ? res.visualizations : [],
    kpis: Array.isArray(res.kpis) ? res.kpis : [],
    insight: res.insight || '',
    recommendations: Array.isArray(res.recommendations) ? res.recommendations : [],
    rootCauseAnalysis: res.rootCauseAnalysis || null,
    trace: Array.isArray(res.trace) ? res.trace : ['intent', 'schema', 'sql', 'validation', 'query', 'visualization'],
    traceDetails: Array.isArray(res.traceDetails) ? res.traceDetails : [],
    isMock: Boolean(res.isMock),
  };
}

/**
 * Simulates a realistic asynchronous backend response with mock data
 */
async function simulateMockExecution(query, context = {}, wasFallback = false) {
  // Simulate natural agent pipeline latency (800ms)
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mock = getMockResponse(query);
  const normalized = normalizeResponse(mock, query);
  normalized.isMock = true;
  normalized.wasFallback = wasFallback;
  return normalized;
}
