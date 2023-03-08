import { inject, singleton } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../common/constants';
import { ICallbackData, ICallbackExportData, IConfig } from '../common/interfaces';

@singleton()
export class CallbackClient extends HttpClient {
  public constructor(@inject(SERVICES.LOGGER) logger: Logger, @inject(SERVICES.CONFIG) private readonly config: IConfig) {
    super(logger, '', 'requestCallback', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async send(callbackUrl: string, data: ICallbackData | ICallbackExportData): Promise<void> {
    this.logger.info(data, `Sending callback request to URL: "${callbackUrl}"`);
    await this.post(callbackUrl, data);
  }
}
