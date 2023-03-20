import config from 'config';
import { logMethod } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { Metrics } from '@map-colonies/telemetry';
import { SERVICES, SERVICE_NAME } from './common/constants';
import { tracing } from './common/tracing';
import { createPackageRouterFactory, CREATE_PACKAGE_ROUTER_SYMBOL } from './createPackage/routes/createPackageRouter';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { tasksRouterFactory, TASKS_ROUTER_SYMBOL } from './tasks/routes/tasksRouter';
import { FinalizationManager, FINALIZATION_MANGER_SYMBOL } from './finalizationManager';
import { IQueueConfig, IExternalClientsConfig } from './common/interfaces';

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
    dequeueIntervalMs: externalClientsConfig.clientsUrls.jobManager.dequeueIntervalMs,
    heartbeatIntervalMs: externalClientsConfig.clientsUrls.heartbeatManager.heartbeatIntervalMs,
    jobType: externalClientsConfig.workerTypes.finalize.jobType,
    tilesTaskType: externalClientsConfig.workerTypes.finalize.taskType,
  };
  // @ts-expect-error the signature is wrong
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, hooks: { logMethod } });

  const metrics = new Metrics(SERVICE_NAME);
  const meter = metrics.start();

  tracing.start();
  const tracer = trace.getTracer(SERVICE_NAME);

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: config } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.QUEUE_CONFIG, provider: { useValue: queueConfig } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.METER, provider: { useValue: meter } },
    { token: CREATE_PACKAGE_ROUTER_SYMBOL, provider: { useFactory: createPackageRouterFactory } },
    { token: TASKS_ROUTER_SYMBOL, provider: { useFactory: tasksRouterFactory } },
    { token: FINALIZATION_MANGER_SYMBOL, provider: { useClass: FinalizationManager } },
    {
      token: 'onSignal',
      provider: {
        useValue: {
          useValue: async (): Promise<void> => {
            await Promise.all([tracing.stop(), metrics.stop()]);
          },
        },
      },
    },
  ];

  return registerDependencies(dependencies, options?.override, options?.useChild);
};
