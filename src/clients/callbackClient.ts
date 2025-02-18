import { inject, singleton } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../common/constants';
import { ICallbackExportData, IConfig } from '../common/interfaces';

@singleton()
export class CallbackClient extends HttpClient {
  public constructor(
    @inject(SERVICES.LOGGER) logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {
    super(
      logger,
      '',
      'requestCallback',
      config.get<IHttpRetryConfig>('externalClientsConfig.httpRetry'),
      config.get<boolean>('externalClientsConfig.disableHttpClientLogs')
    );
  }

  public async send(callbackUrl: string, data: ICallbackExportData): Promise<void> {
    this.logger.info({ data, msg: `Sending callback request to URL: "${callbackUrl}"` });
    await this.post(callbackUrl, data);
  }
}
