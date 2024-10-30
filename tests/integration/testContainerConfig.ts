import { trace } from '@opentelemetry/api';
import jsLogger from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { SERVICES } from '../../src/common/constants';
import { configMock, registerDefaultConfig, getMock, hasMock } from '../mocks/config';
import { InjectionObject } from '../../src/common/dependencyRegistration';
import { IExternalClientsConfig, IJobDefinitions, IQueueConfig } from '../../src/common/interfaces';

function getContainerConfig(): InjectionObject<unknown>[] {
  registerDefaultConfig();
  const externalClientsConfig = configMock.get<IExternalClientsConfig>('externalClientsConfig');
  const jobDefinitionsConfig = configMock.get<IJobDefinitions>('jobDefinitions');
  const queueConfig: IQueueConfig = {
    jobManagerBaseUrl: externalClientsConfig.clientsUrls.jobManager.url,
    heartbeatManagerBaseUrl: externalClientsConfig.clientsUrls.heartbeatManager.url,
    dequeueFinalizeIntervalMs: externalClientsConfig.clientsUrls.jobManager.dequeueFinalizeIntervalMs,
    heartbeatIntervalMs: externalClientsConfig.clientsUrls.heartbeatManager.heartbeatIntervalMs,
    jobType: jobDefinitionsConfig.jobs.export.type,
    tilesTaskType: jobDefinitionsConfig.tasks.export.type,
  };

  const testTracer = trace.getTracer('testTracer');

  return [
    { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
    { token: SERVICES.CONFIG, provider: { useValue: configMock } },
    { token: SERVICES.QUEUE_CONFIG, provider: { useValue: queueConfig } },
    { token: SERVICES.TRACER, provider: { useValue: testTracer } },
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
