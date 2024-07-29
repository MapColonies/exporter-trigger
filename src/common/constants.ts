import { readPackageJsonSync } from '@map-colonies/read-pkg';

export const SERVICE_NAME = readPackageJsonSync().name ?? 'unknown_service';
export const DEFAULT_SERVER_PORT = 80;

export const IGNORED_OUTGOING_TRACE_ROUTES = [
  /^.*\/v1\/metrics.*$/,
  /^.*\/jobs.*$/,
  /^.*\/tasks\/rasterTilesExporter\/rasterFinalizeExporter\/startPending.*$/,
];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/, /^.*\/liveness.*$/];

/* eslint-disable @typescript-eslint/naming-convention */
export const SERVICES: Record<string, symbol> = {
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
  TRACER: Symbol('Tracer'),
  METER: Symbol('Meter'),
  QUEUE_CONFIG: Symbol('IQueueconfig'),
};
/* eslint-enable @typescript-eslint/naming-convention */

export const DEFAULT_PRIORITY = 1000;
export const DEFAULT_CRS = 'EPSG:4326';
export const ZOOM_ZERO_RESOLUTION = 0.703125;
