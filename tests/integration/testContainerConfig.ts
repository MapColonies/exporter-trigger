import { jsLogger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { trace } from '@opentelemetry/api';
import { Registry } from 'prom-client';
import { SERVICES } from '@common/constants';
import type { InjectionObject } from '@common/dependencyRegistration';
import { STORAGE_ROUTER_SYMBOL, storageRouterFactory } from '@src/storage/routes/storageRouter';
import { EXPORT_ROUTER_SYMBOL, exportRouterFactory } from '@src/export/routes/exportRouter';
import { configMock, getMock, hasMock, registerDefaultConfig } from '../mocks/config';

async function getTestContainerConfig(): Promise<InjectionObject<unknown>[]> {
  registerDefaultConfig();
  const logger = await jsLogger({ enabled: false, level: 'info', prettyPrint: true });
  return [
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.CONFIG, provider: { useValue: configMock } },
    { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
    { token: SERVICES.METRICS, provider: { useValue: new Registry() } },
    { token: STORAGE_ROUTER_SYMBOL, provider: { useFactory: storageRouterFactory } },
    { token: EXPORT_ROUTER_SYMBOL, provider: { useFactory: exportRouterFactory } },
  ];
}

const resetContainer = (clearInstances = true): void => {
  if (clearInstances) {
    container.clearInstances();
  }

  getMock.mockReset();
  hasMock.mockReset();
};

export { getTestContainerConfig, resetContainer };
