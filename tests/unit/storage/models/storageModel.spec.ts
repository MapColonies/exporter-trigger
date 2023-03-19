import jsLogger from '@map-colonies/js-logger';
import { StorageManager } from '../../../../src/storage/models/storageManager';
import {
  IStorageStatusResponse
} from '../../../../src/common/interfaces';
import { registerDefaultConfig } from '../../../mocks/config';
import * as utils from '../../../../src/common/utils';

let storageManager: StorageManager;

describe('Storage', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    storageManager = new StorageManager(logger);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('GetStorage', () => {
    /**
     * @deprecated GetMap API - will be deprecated on future
     */
    describe('#getStorage', () => {
      it.only('should return storage status', async () => {
        const storageStatusResponse: IStorageStatusResponse = {
          free: 1000,
          size: 1000
        }

        const getStorageSpy = jest.spyOn(utils, 'getStorageStatus');
        getStorageSpy.mockResolvedValue(storageStatusResponse);

        const storageStatus = await storageManager.getStorage();

        expect(storageStatus.free).toBe(1000);
        expect(storageStatus.size).toBe(1000);
        expect(getStorageSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
