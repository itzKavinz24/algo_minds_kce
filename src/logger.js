const ranks = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level = 'info') {
  const threshold = ranks[level] ?? ranks.info;
  const write = (severity, event, details = {}) => {
    if (ranks[severity] < threshold) return;
    // stderr is mandatory: stdout is reserved for MCP JSON-RPC over stdio.
    process.stderr.write(`${JSON.stringify({ time: new Date().toISOString(), severity, event, ...details })}\n`);
  };
  return {
    debug: (event, details) => write('debug', event, details),
    info: (event, details) => write('info', event, details),
    warn: (event, details) => write('warn', event, details),
    error: (event, details) => write('error', event, details)
  };
}
