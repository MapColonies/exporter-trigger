import { inject, injectable } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { NotFoundError } from '@map-colonies/error-types';
import { LayerMetadata, Link } from '@map-colonies/mc-model-types';
import { SERVICES } from '../common/constants';

interface PycswRecord {
  id: string;
  metadata: LayerMetadata;
  links: Link[];
}
type PycswFindRecordResponse = PycswRecord[] | [undefined];

@injectable()
export class RasterCatalogManagerClient extends HttpClient {
  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger) {
    super(logger, config.get<string>('rasterCatalogManager.url'), 'RasterCatalogManager', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async findLayer(id: string): Promise<PycswRecord> {
    const findLayerUrl = `/records/find`;
    this.logger.info(`Retrieving record with id ${id}`);
    const layer = (await this.post<PycswFindRecordResponse>(findLayerUrl, { id }))[0];

    if (layer === undefined) {
      throw new NotFoundError(`Could not find layer with dbID: ${id}`);
    }

    this.logger.debug(`Retrieved layer: ${JSON.stringify(layer)}`);
    return layer;
  }
}
