import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import config from 'config';
import { SERVICES } from '../../common/constants';
import { IStorageStatusResponse } from '../../common/interfaces';
import { getStorageStatus } from '../../common/utils';

@injectable()
export class StorageManager {
  private readonly gpkgsLocation: string;

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
  }

  public async getStorage(): Promise<IStorageStatusResponse> {
    const storageStatus: IStorageStatusResponse = await getStorageStatus(this.gpkgsLocation);
    this.logger.debug({ storageStatus, msg: `Current storage free and total space for gpkgs location` });

    return {
      free: storageStatus.free,
      size: storageStatus.size,
    };
  }
}
