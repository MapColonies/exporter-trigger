/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import { BadRequestError, InsufficientStorage } from '@map-colonies/error-types';
import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { tracerMock } from '../../../mocks/clients/tracer';
import { jobManagerWrapperMock, updateJobMock, findExportJobMock, createExportMock } from '../../../mocks/clients/jobManagerWrapper';
import { catalogManagerMock, findLayerMock } from '../../../mocks/clients/catalogManagerClient';
import { ExportVersion, ICreateExportJobResponse, ICreatePackageRoi, JobExportDuplicationParams } from '../../../../src/common/interfaces';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import {
  completedExportJob,
  userInput,
  metadataExportJson,
  layerFromCatalogSample,
  fc1,
  featuresRecordsSampleFc1,
  layerMetadataRoi,
  pycswRecord,
  inProgressExportJob,
  fcNoIntersection,
  fcTooHighResolution,
  fcMinResolutionDeg,
  featuresRecordsSampleFcMinResolutionDeg,
} from '../../../mocks/data';
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
    describe('#create', () => {
      it('should create job and return its job and task ids', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          roi: fc1,
          callbackURLs: ['testUrl'],
          crs: 'EPSG:4326',
        };

        const jobDupParams: JobExportDuplicationParams = {
          resourceId: 'string',
          version: '1.0',
          dbId: pycswRecord.id,
          roi: fc1,
          crs: 'EPSG:4326',
        };

        const expectedCreateJobResponse = {
          jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
          taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
          status: OperationStatus.IN_PROGRESS,
        };
        const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');
        const generateExportFileNamesSpy = jest.spyOn(
          CreatePackageManager.prototype as unknown as { generateExportFileNames: jest.Mock },
          'generateExportFileNames'
        );

        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));
        findLayerMock.mockResolvedValue({ ...testPycswRecord });
        createExportMock.mockResolvedValue(expectedCreateJobResponse);
        findExportJobMock.mockResolvedValue(undefined);

        validateFreeSpaceSpy.mockResolvedValue(true);
        const res = await createPackageManager.createPackageRoi(req);

        expect(res).toEqual(expectedCreateJobResponse);
        expect(findLayerMock).toHaveBeenCalledWith(req.dbId);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(createExportMock).toHaveBeenCalledTimes(1);
        expect(findExportJobMock).toHaveBeenCalledTimes(3);
        expect(findExportJobMock.mock.calls[0]).toEqual([OperationStatus.COMPLETED, jobDupParams]);
        expect(findExportJobMock.mock.calls[1]).toEqual([OperationStatus.IN_PROGRESS, jobDupParams, true]);
        expect(findExportJobMock.mock.calls[2]).toEqual([OperationStatus.PENDING, jobDupParams, true]);
        expect(generateExportFileNamesSpy).toHaveBeenCalledTimes(1);
        expect(generateExportFileNamesSpy).toHaveBeenCalledWith(
          testPycswRecord.metadata.productType,
          testPycswRecord.metadata.productId,
          testPycswRecord.metadata.productVersion,
          featuresRecordsSampleFc1
        );
        expect(res).toBe(expectedCreateJobResponse);
      });

      it(`should create job and take original layer's resolution and footprint as ROI`, async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          callbackURLs: ['testUrl'],
          crs: 'EPSG:4326',
        };

        const expectedCreateJobResponse = {
          jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
          taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
          status: OperationStatus.IN_PROGRESS,
        };

        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));

        const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');
        createExportMock.mockResolvedValue(expectedCreateJobResponse);
        findLayerMock.mockResolvedValue({ ...testPycswRecord });
        findExportJobMock.mockResolvedValue(undefined);

        validateFreeSpaceSpy.mockResolvedValue(true);

        const res = await createPackageManager.createPackageRoi(req);
        expect(res).toEqual(expectedCreateJobResponse);
        expect(findLayerMock).toHaveBeenCalledWith(req.dbId);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(createExportMock).toHaveBeenCalledTimes(1);
        expect(findExportJobMock).toHaveBeenCalledTimes(3);
        expect(createExportMock).toHaveBeenCalledWith(
          expect.objectContaining({
            roi: layerMetadataRoi,
          })
        );
      });

      it('should create job with batches from provided minResolutionDeg', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          roi: fcMinResolutionDeg,
          callbackURLs: ['testUrl'],
          crs: 'EPSG:4326',
        };

        const expectedCreateJobResponse = {
          jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
          taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
          status: OperationStatus.IN_PROGRESS,
        };
        const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');
        const generateExportFileNamesSpy = jest.spyOn(
          CreatePackageManager.prototype as unknown as { generateExportFileNames: jest.Mock },
          'generateExportFileNames'
        );

        const calculateEstimateGpkgSizeSpy = jest.spyOn(utils, 'calculateEstimateGpkgSize');
        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));
        findLayerMock.mockResolvedValue({ ...testPycswRecord });
        createExportMock.mockResolvedValue(expectedCreateJobResponse);
        findExportJobMock.mockResolvedValue(undefined);

        validateFreeSpaceSpy.mockResolvedValue(true);
        const res = await createPackageManager.createPackageRoi(req);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        const calculatedBatches = calculateEstimateGpkgSizeSpy.mock.calls[0][0];
        expect(res).toEqual(expectedCreateJobResponse);
        expect(generateExportFileNamesSpy).toHaveBeenCalledTimes(1);
        expect(generateExportFileNamesSpy).toHaveBeenCalledWith(
          testPycswRecord.metadata.productType,
          testPycswRecord.metadata.productId,
          testPycswRecord.metadata.productVersion,
          featuresRecordsSampleFcMinResolutionDeg
        );
        expect(calculatedBatches).toHaveLength(7);
        expect(res).toBe(expectedCreateJobResponse);
      });

      it('should return callbackParam(webhook) for existing completed job', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          callbackURLs: ['testUrl'],
          crs: 'EPSG:4326',
          roi: fc1,
        };
        const jobDupParams: JobExportDuplicationParams = {
          resourceId: pycswRecord.metadata.productId as string,
          version: pycswRecord.metadata.productVersion as string,
          dbId: pycswRecord.id,
          crs: userInput.crs as string,
          roi: fc1,
        };

        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));

        findLayerMock.mockResolvedValue({ ...testPycswRecord });
        createExportMock.mockResolvedValue(undefined);
        findExportJobMock.mockResolvedValue(JSON.parse(JSON.stringify(completedExportJob)));
        updateJobMock.mockResolvedValue(undefined);

        const res = await createPackageManager.createPackageRoi(req);
        expect(findLayerMock).toHaveBeenCalledWith(pycswRecord.id);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(findExportJobMock).toHaveBeenCalledTimes(1);
        expect(findExportJobMock.mock.calls[0]).toEqual([OperationStatus.COMPLETED, jobDupParams]);
        expect(createExportMock).toHaveBeenCalledTimes(0);
        expect(JSON.stringify(res)).toStrictEqual(
          JSON.stringify({ ...completedExportJob.parameters.callbackParams, status: OperationStatus.COMPLETED })
        );
      });

      it('should return job and task-ids of existing pending job', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          callbackURLs: ['testUrl'],
          crs: 'EPSG:4326',
          roi: fc1,
        };
        const jobDupParams: JobExportDuplicationParams = {
          resourceId: pycswRecord.metadata.productId as string,
          version: pycswRecord.metadata.productVersion as string,
          dbId: pycswRecord.id,
          crs: userInput.crs as string,
          roi: fc1,
        };

        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));

        findLayerMock.mockResolvedValue({ ...testPycswRecord });
        createExportMock.mockResolvedValue(undefined);
        findExportJobMock.mockResolvedValueOnce(undefined);
        findExportJobMock.mockResolvedValueOnce(undefined);
        findExportJobMock.mockResolvedValueOnce(JSON.parse(JSON.stringify(inProgressExportJob)));
        findExportJobMock.mockResolvedValueOnce(undefined);
        updateJobMock.mockResolvedValue(undefined);

        const res = await createPackageManager.createPackageRoi(req);
        expect(findLayerMock).toHaveBeenCalledWith(pycswRecord.id);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(findExportJobMock).toHaveBeenCalledTimes(4);
        expect(findExportJobMock.mock.calls[0]).toEqual([OperationStatus.COMPLETED, jobDupParams]);
        expect(findExportJobMock.mock.calls[1]).toEqual([OperationStatus.IN_PROGRESS, jobDupParams, true]);
        expect(findExportJobMock.mock.calls[2]).toEqual([OperationStatus.PENDING, jobDupParams, true]);
        expect(findExportJobMock.mock.calls[3]).toEqual([OperationStatus.COMPLETED, jobDupParams]);
        expect(createExportMock).toHaveBeenCalledTimes(0);
        expect(res).toStrictEqual({
          jobId: inProgressExportJob.id,
          taskIds: ['1f765695-338b-4752-b182-a8cbae3c610e'],
          status: OperationStatus.IN_PROGRESS,
          isDuplicated: true,
        });
      });

      it('should return job and task-ids of existing in progress job', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          callbackURLs: ['testUrl'],
          crs: 'EPSG:4326',
          roi: fc1,
        };
        const jobDupParams: JobExportDuplicationParams = {
          resourceId: pycswRecord.metadata.productId as string,
          version: pycswRecord.metadata.productVersion as string,
          dbId: pycswRecord.id,
          crs: userInput.crs as string,
          roi: fc1,
        };

        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));

        findLayerMock.mockResolvedValue({ ...testPycswRecord });
        createExportMock.mockResolvedValue(undefined);
        findExportJobMock.mockResolvedValueOnce(undefined);
        findExportJobMock.mockResolvedValueOnce(JSON.parse(JSON.stringify(inProgressExportJob)));
        findExportJobMock.mockResolvedValueOnce(undefined);
        updateJobMock.mockResolvedValue(undefined);

        const res = await createPackageManager.createPackageRoi(req);
        expect(findLayerMock).toHaveBeenCalledWith(pycswRecord.id);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(findExportJobMock).toHaveBeenCalledTimes(3);
        expect(findExportJobMock.mock.calls[0]).toEqual([OperationStatus.COMPLETED, jobDupParams]);
        expect(findExportJobMock.mock.calls[1]).toEqual([OperationStatus.IN_PROGRESS, jobDupParams, true]);
        expect(findExportJobMock.mock.calls[2]).toEqual([OperationStatus.COMPLETED, jobDupParams]);
        expect(createExportMock).toHaveBeenCalledTimes(0);
        expect(res).toStrictEqual({
          jobId: inProgressExportJob.id,
          taskIds: ['1f765695-338b-4752-b182-a8cbae3c610e'],
          status: OperationStatus.IN_PROGRESS,
          isDuplicated: true,
        });
      });

      it('should increase callbacks array of existing in progress job', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          callbackURLs: ['http://new-added-callback-url.com'],
          crs: 'EPSG:4326',
          roi: fc1,
        };

        const jobDupParams: JobExportDuplicationParams = {
          resourceId: pycswRecord.metadata.productId as string,
          version: pycswRecord.metadata.productVersion as string,
          dbId: pycswRecord.id,
          crs: userInput.crs as string,
          roi: fc1,
        };
        const expirationDays: number = configMock.get('cleanupExpirationDays');
        const testExpirationDate = new Date();
        testExpirationDate.setDate(testExpirationDate.getDate() - expirationDays);
        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));

        findLayerMock.mockResolvedValue({ ...testPycswRecord });
        createExportMock.mockResolvedValue(undefined);
        updateJobMock.mockResolvedValue(undefined);
        findExportJobMock.mockResolvedValueOnce(undefined);
        findExportJobMock.mockResolvedValueOnce(JSON.parse(JSON.stringify({ ...inProgressExportJob, expirationDate: testExpirationDate })));
        findExportJobMock.mockResolvedValueOnce(undefined);
        const jobUpdateParams = {
          parameters: {
            crs: 'EPSG:4326',
            exportVersion: ExportVersion.ROI,
            callbacks: [
              { url: 'http://localhost:6969', roi: fc1 },
              { url: 'http://new-added-callback-url.com', roi: fc1 },
            ],
            roi: fc1,
            fileNamesTemplates: inProgressExportJob.parameters.fileNamesTemplates,
            gpkgEstimatedSize: inProgressExportJob.parameters.gpkgEstimatedSize,
            relativeDirectoryPath: inProgressExportJob.parameters.relativeDirectoryPath,
          },
        };
        const res = await createPackageManager.createPackageRoi({ ...req, callbackURLs: ['http://new-added-callback-url.com'] });
        const expectedReturn: ICreateExportJobResponse = {
          jobId: inProgressExportJob.id,
          taskIds: ['1f765695-338b-4752-b182-a8cbae3c610e'],
          status: OperationStatus.IN_PROGRESS,
          isDuplicated: true,
        };

        expect(res).toEqual(expectedReturn);
        expect(findLayerMock).toHaveBeenCalledWith(pycswRecord.id);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(findExportJobMock).toHaveBeenCalledTimes(3);
        expect(findExportJobMock.mock.calls[0]).toEqual([OperationStatus.COMPLETED, jobDupParams]);
        expect(findExportJobMock.mock.calls[1]).toEqual([OperationStatus.IN_PROGRESS, jobDupParams, true]);
        expect(findExportJobMock.mock.calls[2]).toEqual([OperationStatus.COMPLETED, jobDupParams]);
        expect(createExportMock).toHaveBeenCalledTimes(0);
        expect(updateJobMock).toHaveBeenCalledWith(inProgressExportJob.id, jobUpdateParams);
      });

      it('should throw bad request error when requested feature is without intersection with layer geometry', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          callbackURLs: ['http://new-added-callback-url.com'],
          crs: 'EPSG:4326',
          roi: fcNoIntersection,
        };

        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));
        findLayerMock.mockResolvedValue({ ...testPycswRecord });

        const action = async () => createPackageManager.createPackageRoi(req);

        await expect(action).rejects.toThrow(BadRequestError);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(findLayerMock).toHaveBeenCalledWith(pycswRecord.id);
      });

      it('should throw bad request error when requested feature maxDegResolution is higher than the layer resolution', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          callbackURLs: ['http://new-added-callback-url.com'],
          crs: 'EPSG:4326',
          roi: fcTooHighResolution,
        };

        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));
        findLayerMock.mockResolvedValue({ ...testPycswRecord });

        const action = async () => createPackageManager.createPackageRoi(req);

        await expect(action).rejects.toThrow(BadRequestError);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(findLayerMock).toHaveBeenCalledWith(pycswRecord.id);
      });

      it('should throw bad request error when requested gpkg estimated size is larger than storage', async () => {
        const req: ICreatePackageRoi = {
          dbId: pycswRecord.id,
          roi: fc1,
          callbackURLs: ['testUrl'],
          crs: 'EPSG:4326',
        };

        const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');

        const testPycswRecord = JSON.parse(JSON.stringify(pycswRecord));
        findLayerMock.mockResolvedValue({ ...testPycswRecord });
        findExportJobMock.mockResolvedValue(undefined);
        validateFreeSpaceSpy.mockResolvedValue(false);

        const action = async () => createPackageManager.createPackageRoi(req);
        await expect(action).rejects.toThrow(InsufficientStorage);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(findLayerMock).toHaveBeenCalledWith(pycswRecord.id);
        expect(createExportMock).toHaveBeenCalledTimes(0);
      });
    });
  });
});
