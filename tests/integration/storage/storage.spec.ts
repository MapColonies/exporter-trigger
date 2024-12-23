import httpStatusCodes from 'http-status-codes';
import { InvalidPathError, NoMatchError } from 'check-disk-space';
import { getApp } from '../../../src/app';
import { getContainerConfig, resetContainer } from '../testContainerConfig';
import { IStorageStatusResponse } from '../../../src/common/interfaces';
import * as utils from '../../../src/common/utils';
import { StorageSender } from './helpers/storageSender';

describe('storage', function () {
  let requestSender: StorageSender;
  let getStorageSpy: jest.SpyInstance;

  beforeEach(function () {
    const [app] = getApp({
      override: [...getContainerConfig()],
      useChild: true,
    });
    requestSender = new StorageSender(app);
    getStorageSpy = jest.spyOn(utils, 'getStorageStatus');
  });

  afterEach(function () {
    resetContainer();
    jest.resetAllMocks();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the storage details', async function () {
      const storageStatusResponse: IStorageStatusResponse = {
        free: 1000,
        size: 1000,
      };

      getStorageSpy.mockResolvedValue(storageStatusResponse);

      const resposne = await requestSender.getStorage();
      expect(resposne).toSatisfyApiSpec();
      expect(JSON.stringify(resposne.body)).toBe(JSON.stringify(storageStatusResponse));
      expect(getStorageSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Bad Path', function () {
    it('should return 500 status code because of invalid path', async function () {
      getStorageSpy.mockImplementation(() => {
        throw new InvalidPathError();
      });

      const resposne = await requestSender.getStorage();
      expect(resposne).toSatisfyApiSpec();
      expect(getStorageSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return 500 status code because of no match on path', async function () {
      getStorageSpy.mockImplementation(() => {
        throw new NoMatchError();
      });

      const resposne = await requestSender.getStorage();
      expect(resposne).toSatisfyApiSpec();
      expect(getStorageSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
