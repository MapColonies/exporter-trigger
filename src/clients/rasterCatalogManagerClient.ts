import { inject, injectable } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { NotFoundError } from '@map-colonies/error-types';
import { Tracer } from '@opentelemetry/api';
import { SERVICES } from '../common/constants';
import { LayerInfo } from '../common/interfaces';

@injectable()
export class RasterCatalogManagerClient extends HttpClient {
  public constructor(
    @inject(SERVICES.LOGGER) protected readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    super(
      logger,
      config.get<string>('externalClientsConfig.clientsUrls.rasterCatalogManager.url'),
      'RasterCatalogManager',
      config.get<IHttpRetryConfig>('externalClientsConfig.httpRetry'),
      config.get<boolean>('externalClientsConfig.disableHttpClientLogs')
    );
  }

  public async findLayer(id: string): Promise<LayerInfo> {
    const findLayerUrl = `/records/find`;
    this.logger.info({ msg: `Retrieving catalog record with id ${id}` }, id);

    const layers = await this.post<LayerInfo[]>(findLayerUrl, { id });

    if (layers.length === 0) {
      throw new NotFoundError(`Could not find catalog layer with id: ${id}`);
    }

    this.logger.debug({ msg: `Retrieved layer with id ${id}` });
    return layers[0];
  }
}
