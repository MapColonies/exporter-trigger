import { inject, injectable } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../common/constants';
import { AxiosResponse } from 'axios';

type ArrayOfDict = (Record<string, unknown> | undefined)[];

@injectable()
export class RasterCatalogManager extends HttpClient {
  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger) {
    super(logger, config.get<string>('rasterCatalogManager.url'), 'RasterCatalogManager', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async findLayer(id: string) {
    const findLayerUrl = `/records/find`;
    this.logger.info(`Retrieving record with id ${id}`);
    const layer = (await this.post<AxiosResponse>(findLayerUrl, { id })).data as ArrayOfDict[0];

    return layer;
  }
}
