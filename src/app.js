import { settings } from './config.js';
import { createLogger } from './logger.js';
import { SourceRegistry } from './source-registry.js';
import { MetadataService } from './metadata-service.js';
import { QueryService } from './query-service.js';
import { createServer } from './server.js';

export function buildServices(overrides = {}) {
  const logger = overrides.logger ?? createLogger(settings.logLevel);
  const registry = overrides.registry ?? new SourceRegistry(settings.sources, logger);
  const metadata = overrides.metadata ?? new MetadataService(registry, settings);
  const queries = overrides.queries ?? new QueryService(registry, settings, logger);
  return { registry, metadata, queries, logger };
}

export function buildApplication(overrides = {}) {
  const services = buildServices(overrides);
  return { server: createServer(services), ...services };
}
