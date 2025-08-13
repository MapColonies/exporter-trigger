import jsLogger from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { trace } from '@opentelemetry/api';
import { SERVICES } from '@common/constants';
import { InjectionObject } from '@common/dependencyRegistration';
import { STORAGE_ROUTER_SYMBOL, storageRouterFactory } from '@src/storage/routes/storageRouter';
import { EXPORT_ROUTER_SYMBOL, exportRouterFactory } from '@src/export/routes/exportRouter';
import { configMock, getMock, hasMock, registerDefaultConfig } from '../mocks/config';

function getTestContainerConfig(): InjectionObject<unknown>[] {
  registerDefaultConfig();
  return [
    { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: true, level: 'debug', prettyPrint: true }) } },
    { token: SERVICES.CONFIG, provider: { useValue: configMock } },
    { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
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
