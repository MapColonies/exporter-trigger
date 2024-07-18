/* eslint-disable import/first */
// this import must be called before the first import of tsyring
import 'reflect-metadata';
import { createServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import config from 'config';
import { Span, Tracer } from '@opentelemetry/api';
import { DEFAULT_SERVER_PORT, SERVICES } from './common/constants';
import { FinalizationManager, FINALIZATION_MANGER_SYMBOL } from './finalizationManager';
import { getApp } from './app';

interface IServerConfig {
  port: string;
}

const serverConfig = config.get<IServerConfig>('server');
const port: number = parseInt(serverConfig.port) || DEFAULT_SERVER_PORT;

const app = getApp();

const logger = container.resolve<Logger>(SERVICES.LOGGER);
const tracer = container.resolve<Tracer>(SERVICES.TRACER);
const stubHealthcheck = async (): Promise<void> => Promise.resolve();
// eslint-disable-next-line @typescript-eslint/naming-convention
const server = createTerminus(createServer(app), { healthChecks: { '/liveness': stubHealthcheck, onSignal: container.resolve('onSignal') } });
const finalizationManager: FinalizationManager = container.resolve(FINALIZATION_MANGER_SYMBOL);
server.listen(port, () => {
  logger.info(`App started on port ${port}`);
});
const mainPollLoop = async (): Promise<void> => {
  const pollingTimout = config.get<number>('finalizePollingTimeMS');
  const isRunning = true;
  logger.info({ msg: 'Running job status poll' });
  //eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (isRunning) {
    let polledData = false;
    let finalizePolledData = false;

    //tail sampling is needed here! https://opentelemetry.io/docs/concepts/sampling/
    await tracer.startActiveSpan('mainPollingLoop',async (span: Span) => {
      try {
        polledData = await finalizationManager.jobStatusPoll();
        finalizePolledData = await finalizationManager.jobFinalizePoll();
      } catch (error) {
        logger.error({ err: error, msg: `Main loop poll error occurred` });
      } finally {
        if (!(polledData || finalizePolledData)) {
          await new Promise((resolve) => setTimeout(resolve, pollingTimout));
        }
      }
      span.end();
    });
  }
};

void mainPollLoop();
