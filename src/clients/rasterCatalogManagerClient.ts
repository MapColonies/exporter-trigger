import { inject, injectable } from 'tsyringe';
import { HttpClient } from '@map-colonies/mc-utils';
import type { Logger } from '@map-colonies/js-logger';
import { NotFoundError } from '@map-colonies/error-types';
import type { Tracer } from '@opentelemetry/api';
import { SERVICES } from '../common/constants';
import { LayerInfo } from '../common/interfaces';
import type { ConfigType } from '../common/config';

@injectable()
export class RasterCatalogManagerClient extends HttpClient {
  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) protected override readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    super(
      logger,
      config.get('externalClientsConfig.clientsUrls.rasterCatalogManager.url') as unknown as string,
      'RasterCatalogManager',
      config.get('externalClientsConfig.httpRetry'),
      config.get('externalClientsConfig.disableHttpClientLogs')
    );
  }

  public async findLayer(id: string): Promise<LayerInfo> {
    const findLayerUrl = `/records/find`;
    this.logger.info({ msg: `Retrieving catalog record with id ${id}` });

    const layers = await this.post<LayerInfo[]>(findLayerUrl, { id });

    if (layers.length === 0) {
      throw new NotFoundError(`Could not find catalog layer with id: ${id}`);
    }

    this.logger.debug({ msg: `Retrieved layer with id ${id}` });
    return layers[0]!;
  }
}
