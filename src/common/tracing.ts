import { Tracing } from '@map-colonies/telemetry';
import { ExpressInstrumentation, ExpressLayerType  } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IGNORED_INCOMING_TRACE_ROUTES, IGNORED_OUTGOING_TRACE_ROUTES } from './constants';

export const tracing = new Tracing(
  [
    new HttpInstrumentation({
      ignoreIncomingPaths: IGNORED_INCOMING_TRACE_ROUTES,
      ignoreOutgoingUrls: IGNORED_OUTGOING_TRACE_ROUTES,
    }),
    new ExpressInstrumentation(),
  ],
  {
    /* eslint-disable @typescript-eslint/naming-convention */
    '@opentelemetry/instrumentation-fs': { requireParentSpan: true },
    '@opentelemetry/instrumentation-http': { requireParentforOutgoingSpans: true },
    '@opentelemetry/instrumentation-express': { ignoreLayersType: [ExpressLayerType.MIDDLEWARE] },
    /* eslint-disable @typescript-eslint/naming-convention */
  }
);