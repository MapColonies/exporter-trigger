import { trace } from '@opentelemetry/api';
import jsLogger from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { SERVICES } from '../../src/common/constants';
import { configMock, registerDefaultConfig, getMock, hasMock } from '../mocks/config';
import { InjectionObject } from '../../src/common/dependencyRegistration';
import { IQueueConfig } from '../../src/common/interfaces';

function getContainerConfig(): InjectionObject<unknown>[] {
  registerDefaultConfig();
  return [
    { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
    { token: SERVICES.CONFIG, provider: { useValue: configMock } },
    { token: SERVICES.QUEUE_CONFIG, provider: { useValue: configMock.get<IQueueConfig>('queue') } },
    { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
  ];
}
const resetContainer = (clearInstances = true): void => {
  if (clearInstances) {
    container.clearInstances();
  }

  getMock.mockReset();
  hasMock.mockReset();
};

export { getContainerConfig, resetContainer };
