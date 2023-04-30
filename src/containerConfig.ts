import config from 'config';
import { logMethod } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { SERVICES, SERVICE_NAME } from './common/constants';
import { tracing } from './common/tracing';
import { createPackageRouterFactory, CREATE_PACKAGE_ROUTER_SYMBOL } from './createPackage/routes/createPackageRouter';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { tasksRouterFactory, TASKS_ROUTER_SYMBOL } from './tasks/routes/tasksRouter';
import { FinalizationManager, FINALIZATION_MANGER_SYMBOL } from './finalizationManager';
import { IQueueConfig, IExternalClientsConfig } from './common/interfaces';
import { storageRouterFactory, STORAGE_ROUTER_SYMBOL } from './storage/routes/storageRouter';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = (options?: RegisterOptions): DependencyContainer => {
  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  const externalClientsConfig = config.get<IExternalClientsConfig>('externalClientsConfig');
  const queueConfig: IQueueConfig = {
    jobManagerBaseUrl: externalClientsConfig.clientsUrls.jobManager.url,
    heartbeatManagerBaseUrl: externalClientsConfig.clientsUrls.heartbeatManager.url,
    dequeueFinalizeIntervalMs: externalClientsConfig.clientsUrls.jobManager.dequeueFinalizeIntervalMs,
    heartbeatIntervalMs: externalClientsConfig.clientsUrls.heartbeatManager.heartbeatIntervalMs,
    jobType: externalClientsConfig.exportJobAndTaskTypes.jobType,
    tilesTaskType: externalClientsConfig.exportJobAndTaskTypes.taskFinalizeType,
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, hooks: { logMethod } });

  const tracer = trace.getTracer(SERVICE_NAME);

  tracing.start();

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: config } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.QUEUE_CONFIG, provider: { useValue: queueConfig } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: STORAGE_ROUTER_SYMBOL, provider: { useFactory: storageRouterFactory } },
    { token: CREATE_PACKAGE_ROUTER_SYMBOL, provider: { useFactory: createPackageRouterFactory } },
    { token: TASKS_ROUTER_SYMBOL, provider: { useFactory: tasksRouterFactory } },
    { token: FINALIZATION_MANGER_SYMBOL, provider: { useClass: FinalizationManager } },
    {
      token: 'onSignal',
      provider: {
        useValue: {
          useValue: async (): Promise<void> => {
            await Promise.all([tracing.stop()]);
          },
        },
      },
    },
  ];

  return registerDependencies(dependencies, options?.override, options?.useChild);
};
