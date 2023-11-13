/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import { sep } from 'path';
import { BadRequestError, InsufficientStorage } from '@map-colonies/error-types';
import jsLogger from '@map-colonies/js-logger';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { BBox, Polygon } from '@turf/helpers';
import {
  jobManagerWrapperMock,
  findCompletedJobMock,
  findInProgressJobMock,
  findPendingJobMock,
  updateJobMock,
  createMock,
  findExportJobMock,
  createExportMock,
} from '../../../mocks/clients/jobManagerWrapper';
import { catalogManagerMock, findLayerMock } from '../../../mocks/clients/catalogManagerClient';
import {
  ExportVersion,
  ICreateExportJobResponse,
  ICreateJobResponse,
  ICreatePackage,
  ICreatePackageRoi,
  IJobParameters,
  ITaskParameters,
  JobDuplicationParams,
  JobExportDuplicationParams,
} from '../../../../src/common/interfaces';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import {
  completedExportJob,
  completedJob,
  inProgressJob,
  layerFromCatalog,
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
import { METADA_JSON_FILE_EXTENSION } from '../../../../src/common/constants';
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
    createPackageManager = new CreatePackageManager(configMock, logger, jobManagerWrapperMock, catalogManagerMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });
  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  describe('GetMAP', () => {
    describe('#create', () => {
      it('should create job and return its job and task ids', async () => {
        const req: ICreatePackage = {
          dbId: layerFromCatalog.id,
          bbox: [0, 1, 3, 5],
          callbackURLs: ['testUrl'],
          targetResolution: 0.0439453125,
          crs: 'EPSG:4326',
        };

        const expectedsanitizedBbox: BBox = [0, 0, 11.25, 11.25];
        const jobDupParams: JobDuplicationParams = {
          resourceId: 'string',
          version: '1.0',
          dbId: layerFromCatalog.id,
          zoomLevel: 4,
          sanitizedBbox: expectedsanitizedBbox,
          crs: 'EPSG:4326',
        };

        const expectedCreateJobResponse = {
          jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
          taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
          status: OperationStatus.IN_PROGRESS,
        };
        const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');

        findLayerMock.mockResolvedValue(layerFromCatalog);
        createMock.mockResolvedValue(expectedCreateJobResponse);
        findCompletedJobMock.mockResolvedValue(undefined);
        findInProgressJobMock.mockResolvedValue(undefined);
        findPendingJobMock.mockResolvedValue(undefined);
        validateFreeSpaceSpy.mockResolvedValue(true);
        const res = await createPackageManager.createPackage(req);

        expect(res).toEqual(expectedCreateJobResponse);
        expect(findLayerMock).toHaveBeenCalledWith(req.dbId);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(findCompletedJobMock).toHaveBeenCalledWith(jobDupParams);
        expect(findCompletedJobMock).toHaveBeenCalledTimes(1);
        expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
        expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
      });

      it('should create job and convert provided footprint to bbox', async () => {
        const footprint: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [25, 15],
              [50, 15],
              [50, 40],
              [25, 40],
              [25, 15],
            ],
          ],
        };
        const req: ICreatePackage = {
          dbId: layerFromCatalog.id,
          bbox: footprint,
          callbackURLs: ['testUrl'],
          targetResolution: 0.0439453125,
          crs: 'EPSG:4326',
        };

        const expectedsanitizedBbox: BBox = [22.5, 11.25, 56.25, 45];
        const jobDupParams: JobDuplicationParams = {
          resourceId: 'string',
          version: '1.0',
          dbId: layerFromCatalog.id,
          zoomLevel: 4,
          sanitizedBbox: expectedsanitizedBbox,
          crs: 'EPSG:4326',
        };

        const expectedCreateJobResponse = {
          jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
          taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
          status: OperationStatus.IN_PROGRESS,
        };
        const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');
        const normalize2PolygonSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { normalize2Polygon: jest.Mock }, 'normalize2Polygon');

        findLayerMock.mockResolvedValue(layerFromCatalog);
        createMock.mockResolvedValue(expectedCreateJobResponse);
        findCompletedJobMock.mockResolvedValue(undefined);
        findInProgressJobMock.mockResolvedValue(undefined);
        findPendingJobMock.mockResolvedValue(undefined);
        validateFreeSpaceSpy.mockResolvedValue(true);
        const res = await createPackageManager.createPackage(req);

        expect(res).toEqual(expectedCreateJobResponse);
        expect(findLayerMock).toHaveBeenCalledWith(req.dbId);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(normalize2PolygonSpy).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(findCompletedJobMock).toHaveBeenCalledWith(jobDupParams);
        expect(findCompletedJobMock).toHaveBeenCalledTimes(1);
        expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
        expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
      });

      it(`should create job and take original layer's resolution and sanitized bbox`, async () => {
        const req: ICreatePackage = {
          dbId: layerFromCatalog.id,
          callbackURLs: ['testUrl'],
          crs: 'EPSG:4326',
        };

        const expectedCreateJobResponse = {
          jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
          taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
          status: OperationStatus.IN_PROGRESS,
        };

        const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');

        const expectedsanitizedBbox: BBox = [0, -90, 180, 90];
        const expectedTargetResolution = layerFromCatalog.metadata.maxResolutionDeg;

        findLayerMock.mockResolvedValue(layerFromCatalog);
        createMock.mockResolvedValue(expectedCreateJobResponse);
        findCompletedJobMock.mockResolvedValue(undefined);
        findInProgressJobMock.mockResolvedValue(undefined);
        findPendingJobMock.mockResolvedValue(undefined);
        validateFreeSpaceSpy.mockResolvedValue(true);

        const res = await createPackageManager.createPackage(req);

        expect(res).toEqual(expectedCreateJobResponse);
        expect(findLayerMock).toHaveBeenCalledWith(req.dbId);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledWith(
          expect.objectContaining({
            targetResolution: expectedTargetResolution,
            sanitizedBbox: expectedsanitizedBbox,
          })
        );
      });

      it('should return job and task-ids of existing in pending job', async () => {
        const expectedsanitizedBbox: BBox = [0, 2.8125, 25.3125, 42.1875];
        const jobDupParams: JobDuplicationParams = {
          resourceId: layerFromCatalog.metadata.productId as string,
          version: layerFromCatalog.metadata.productVersion as string,
          dbId: layerFromCatalog.id,
          zoomLevel: 7,
          sanitizedBbox: expectedsanitizedBbox,
          crs: userInput.crs as string,
        };

        findLayerMock.mockResolvedValue(layerFromCatalog);
        createMock.mockResolvedValue(undefined);
        updateJobMock.mockResolvedValue(undefined);
        findCompletedJobMock.mockResolvedValue(undefined);
        findInProgressJobMock.mockResolvedValue(undefined);
        findPendingJobMock.mockResolvedValue(JSON.parse(JSON.stringify(inProgressJob)));

        await createPackageManager.createPackage(userInput);

        expect(findLayerMock).toHaveBeenCalledWith(layerFromCatalog.id);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledTimes(0);
        expect(findCompletedJobMock).toHaveBeenNthCalledWith(1, jobDupParams);
        expect(findCompletedJobMock).toHaveBeenNthCalledWith(2, jobDupParams);
        expect(findCompletedJobMock).toHaveBeenCalledTimes(2);
        expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
        expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
        expect(findPendingJobMock).toHaveBeenCalledWith(jobDupParams);
        expect(findPendingJobMock).toHaveBeenCalledTimes(1);
      });

      it('should return job and task-ids of existing in progress job', async () => {
        const expectedsanitizedBbox: BBox = [0, 2.8125, 25.3125, 42.1875];
        const jobDupParams: JobDuplicationParams = {
          resourceId: layerFromCatalog.metadata.productId as string,
          version: layerFromCatalog.metadata.productVersion as string,
          dbId: layerFromCatalog.id,
          zoomLevel: 7,
          sanitizedBbox: expectedsanitizedBbox,
          crs: userInput.crs as string,
        };

        findLayerMock.mockResolvedValue(layerFromCatalog);
        createMock.mockResolvedValue(undefined);
        updateJobMock.mockResolvedValue(undefined);
        findCompletedJobMock.mockResolvedValue(undefined);
        findInProgressJobMock.mockResolvedValue(JSON.parse(JSON.stringify(inProgressJob)));

        const res = await createPackageManager.createPackage(userInput);
        const expectedReturn: ICreateJobResponse = {
          id: inProgressJob.id,
          taskIds: [(inProgressJob.tasks as unknown as IJobResponse<IJobParameters, ITaskParameters>[])[0].id],
          status: OperationStatus.IN_PROGRESS,
        };

        expect(res).toEqual(expectedReturn);
        expect(findLayerMock).toHaveBeenCalledWith(jobDupParams.dbId);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledTimes(0);
        expect(findCompletedJobMock).toHaveBeenNthCalledWith(1, jobDupParams);
        expect(findCompletedJobMock).toHaveBeenNthCalledWith(2, jobDupParams);
        expect(findCompletedJobMock).toHaveBeenCalledTimes(2);
        expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
        expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
        expect(findPendingJobMock).toHaveBeenCalledTimes(0);
      });

      it('should increase callbacks array of existing in progress job', async () => {
        const expectedsanitizedBbox: BBox = [0, 2.8125, 25.3125, 42.1875];
        const jobDupParams: JobDuplicationParams = {
          resourceId: layerFromCatalog.metadata.productId as string,
          version: layerFromCatalog.metadata.productVersion as string,
          dbId: layerFromCatalog.id,
          zoomLevel: 7,
          sanitizedBbox: expectedsanitizedBbox,
          crs: userInput.crs as string,
        };
        const expirationDays: number = configMock.get('cleanupExpirationDays');
        const testExpirationDate = new Date();
        testExpirationDate.setDate(testExpirationDate.getDate() - expirationDays);
        findLayerMock.mockResolvedValue(layerFromCatalog);
        createMock.mockResolvedValue(undefined);
        updateJobMock.mockResolvedValue(undefined);
        findCompletedJobMock.mockResolvedValue(undefined);
        findInProgressJobMock.mockResolvedValue(JSON.parse(JSON.stringify({ ...inProgressJob, expirationDate: testExpirationDate })));
        const jobUpdateParams = {
          parameters: {
            fileName: 'test.gpkg',
            relativeDirectoryPath: 'test',
            crs: 'EPSG:4326',
            sanitizedBbox: [0, 0, 25, 41],
            zoomLevel: 4,
            exportVersion: ExportVersion.GETMAP,
            callbacks: [
              { url: 'http://localhost:6969', bbox: [0, 0, 25, 41] },
              { url: 'http://new-added-callback-url.com', bbox: [-5, 3, 25, 41] },
            ],
            targetResolution: 0.0439453125,
          },
        };
        const res = await createPackageManager.createPackage({ ...userInput, callbackURLs: ['http://new-added-callback-url.com'] });
        const expectedReturn: ICreateJobResponse = {
          id: inProgressJob.id,
          taskIds: [(inProgressJob.tasks as unknown as IJobResponse<IJobParameters, ITaskParameters>[])[0].id],
          status: OperationStatus.IN_PROGRESS,
        };

        expect(res).toEqual(expectedReturn);
        expect(findLayerMock).toHaveBeenCalledWith(jobDupParams.dbId);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledTimes(0);
        expect(findCompletedJobMock).toHaveBeenNthCalledWith(1, jobDupParams);
        expect(findCompletedJobMock).toHaveBeenNthCalledWith(2, jobDupParams);
        expect(findCompletedJobMock).toHaveBeenCalledTimes(2);
        expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
        expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
        expect(updateJobMock).toHaveBeenCalledWith('fa3ab609-377a-4d96-bf0b-e0bb72f683b8', jobUpdateParams);
        expect(findPendingJobMock).toHaveBeenCalledTimes(0);
      });

      it('should throw bad request error when requested resolution is higher than the layer resolution', async () => {
        const layer = { ...layerFromCatalog, metadata: { ...layerFromCatalog.metadata, maxResolutionDeg: 0.072 } };
        findLayerMock.mockResolvedValue(layer);

        const action = async () => createPackageManager.createPackage(userInput);

        await expect(action).rejects.toThrow(BadRequestError);
        expect(findLayerMock).toHaveBeenCalledTimes(1);
        expect(findLayerMock).toHaveBeenCalledWith(layer.id);
      });
    });
    describe('#createMetadata', () => {
      it('should create metadata.json file with the correct parameters', async () => {
        const fileName = 'file';
        const directoryName = '/tmp/gpkgDir';

        const mockGgpkgPath = `${directoryName}/${fileName}`;

        findLayerMock.mockResolvedValue(layerFromCatalog);

        await createPackageManager.createJsonMetadata(mockGgpkgPath, completedJob);

        const expectedFileName = `${directoryName}${sep}${fileName}${METADA_JSON_FILE_EXTENSION}`;
        const expectedMetadata: LayerMetadata = {
          ...layerFromCatalog.metadata,
          maxResolutionDeg: completedJob.parameters.targetResolution,
          footprint: {
            type: 'Feature',
            bbox: [0, 0, 25, 41],
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 0],
                  [25, 0],
                  [25, 41],
                  [0, 41],
                  [0, 0],
                ],
              ],
            },
          },
        };

        expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
        expect(fs.promises.writeFile).toHaveBeenCalledWith(expectedFileName, JSON.stringify(expectedMetadata));
      });
    });
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
