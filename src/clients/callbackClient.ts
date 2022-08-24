import { inject, singleton } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../common/constants';
import { ICallbackData, IConfig } from '../common/interfaces';

@singleton()
export class CallbackClient extends HttpClient {
  public constructor(@inject(SERVICES.LOGGER) logger: Logger, @inject(SERVICES.CONFIG) private readonly config: IConfig) {
    super(logger, '', 'requestCallback', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async send(callbackUrl: string, params: ICallbackData): Promise<void> {
    this.logger.info(`send Callback request to URL: ${callbackUrl} with data ${JSON.stringify(params)}`);
    await this.post(callbackUrl, params);
  }
}
