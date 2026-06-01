import type { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { withSpanAsyncV4 } from '@map-colonies/tracing-utils';
import type { Tracer } from '@opentelemetry/api';
import { SERVICES } from '../../common/constants';
import { IStorageStatusResponse } from '../../common/interfaces';
import type { ConfigType } from '../../common/config';
import * as utils from '../../common/utils';

@injectable()
export class StorageManager {
  private readonly gpkgsLocation: string;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    this.gpkgsLocation = String(config.get('gpkgsLocation'));
  }

  @withSpanAsyncV4
  public async getStorage(): Promise<IStorageStatusResponse> {
    const storageStatus: IStorageStatusResponse = await utils.getStorageStatus(this.gpkgsLocation);
    this.logger.debug({ msg: `Current storage status for gpkgs location`, storageStatus });

    return {
      free: storageStatus.free,
      size: storageStatus.size,
    };
  }
}
