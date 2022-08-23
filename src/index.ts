/* eslint-disable import/first */
// this import must be called before the first import of tsyring
import 'reflect-metadata';
import { createServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import config from 'config';
import { DEFAULT_SERVER_PORT, SERVICES } from './common/constants';
import { PollingManager, POLLING_MANGER_SYMBOL } from './pollingManager';

import { getApp } from './app';

interface IServerConfig {
  port: string;
}

const serverConfig = config.get<IServerConfig>('server');
const port: number = parseInt(serverConfig.port) || DEFAULT_SERVER_PORT;

const app = getApp();

const logger = container.resolve<Logger>(SERVICES.LOGGER);
const stubHealthcheck = async (): Promise<void> => Promise.resolve();
const server = createTerminus(createServer(app), { healthChecks: { '/liveness': stubHealthcheck, onSignal: container.resolve('onSignal') } });
const pollingManager: PollingManager = container.resolve(POLLING_MANGER_SYMBOL);
server.listen(port, () => {
  logger.info(`app started on port ${port}`);
});
const mainPollLoop = async (): Promise<void> => {
  const pollingTimout = config.get<number>('pollingTimeoutMS');
  const isRunning = true;
  logger.debug('running job status poll');
  //eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (isRunning) {
    try {
      await pollingManager.jobStatusPoll();
      await new Promise((resolve) => setTimeout(resolve, pollingTimout));
    } catch (error) {
      logger.error(`mainPollLoop: Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      await new Promise((resolve) => setTimeout(resolve, pollingTimout));
    }
  }
};

void mainPollLoop();
