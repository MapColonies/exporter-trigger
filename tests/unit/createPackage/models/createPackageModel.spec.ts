/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import jsLogger from '@map-colonies/js-logger';
import { tracerMock } from '../../../mocks/clients/tracer';
import { jobManagerWrapperMock } from '../../../mocks/clients/jobManagerWrapper';
import { catalogManagerMock, findLayerMock } from '../../../mocks/clients/catalogManagerClient';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import { completedExportJob, metadataExportJson, layerFromCatalogSample } from '../../../mocks/data';
import { configMock, registerDefaultConfig } from '../../../mocks/config';
import * as utils from '../../../../src/common/utils';

jest.mock('fs', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...jest.requireActual('fs'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    promises: {
      ...jest.requireActual('fs/promises'),
      writeFile: jest.fn(),
    },
  };
});

let createPackageManager: CreatePackageManager;

describe('CreatePackageManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    createPackageManager = new CreatePackageManager(configMock, logger, tracerMock, jobManagerWrapperMock, catalogManagerMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('ROI', () => {
    describe('#createExportMetadata', () => {
      it('should create metadata.json file with the correct parameters', async () => {
        const gpkgLocation = configMock.get<string>('gpkgsLocation');
        const concatFsPathsSpy = jest.spyOn(utils, 'concatFsPaths');
        const getFilesha256HashSpy = jest.spyOn(utils, 'getFilesha256Hash');
        getFilesha256HashSpy.mockResolvedValue('sha256_hash_mock');
        const parseFeatureCollectionSpy = jest.spyOn(utils, 'parseFeatureCollection');
        findLayerMock.mockResolvedValue(layerFromCatalogSample);

        await createPackageManager.createExportJsonMetadata({ ...completedExportJob });
        expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
        expect(parseFeatureCollectionSpy).toHaveBeenCalledTimes(1);
        expect(parseFeatureCollectionSpy).toHaveBeenCalledWith(completedExportJob.parameters.roi);
        expect(getFilesha256HashSpy).toHaveBeenCalledTimes(1);
        expect(concatFsPathsSpy).toHaveBeenCalledTimes(2);
        expect(concatFsPathsSpy).toHaveBeenCalledWith(
          gpkgLocation,
          completedExportJob.parameters.relativeDirectoryPath,
          completedExportJob.parameters.fileNamesTemplates.metadataURI
        );
        const expectedFileName = utils.concatFsPaths(
          gpkgLocation,
          completedExportJob.parameters.relativeDirectoryPath,
          completedExportJob.parameters.fileNamesTemplates.metadataURI
        );
        expect(fs.promises.writeFile).toHaveBeenCalledWith(expectedFileName, JSON.stringify(metadataExportJson));
      });

      it('should fail on metadata.json creation(because finding layer from catalog)', async () => {
        const concatFsPathsSpy = jest.spyOn(utils, 'concatFsPaths');
        const parseFeatureCollectionSpy = jest.spyOn(utils, 'parseFeatureCollection');
        findLayerMock.mockRejectedValue({ msg: 'Layer Not found' });
        const result = await createPackageManager.createExportJsonMetadata(completedExportJob);
        expect(result).toBe(false);
        expect(parseFeatureCollectionSpy).toHaveBeenCalledTimes(0);
        expect(concatFsPathsSpy).toHaveBeenCalledTimes(0);
        expect(fs.promises.writeFile).toHaveBeenCalledTimes(0);
      });
    });
  });
});
