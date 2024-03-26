/* eslint-disable @typescript-eslint/no-magic-numbers */
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { ExportVersion, JobFinalizeResponse } from '../../../src/common/interfaces';
import { fc1 } from '../data';

export const mockCompletedJob: JobFinalizeResponse = {
  id: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
  resourceId: 'testCompleted',
  domain: 'testDomain',
  version: '1.0',
  type: 'rasterTilesExporter',
  description: 'test job',
  parameters: {
    crs: 'EPSG:4326',
    roi: fc1,
    callbacks: [
      {
        url: 'http://localhost:1234',
        roi: fc1,
      },
      {
        url: 'http://localhost:5678',
        roi: fc1,
      },
    ],
    exportVersion: ExportVersion.ROI,
    gpkgEstimatedSize: 187500,
    fileNamesTemplates: {
      dataURI: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.gpkg',
      metadataURI: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.json',
    },
    relativeDirectoryPath: '415c9316e58862194145c4b54cf9d87e',
  },
  status: OperationStatus.IN_PROGRESS,
  percentage: 100,
  reason: '',
  isCleaned: false,
  priority: 0,
  expirationDate: undefined,
  internalId: '880a9316-0f10-4874-92e2-a62d587a1169',
  producerName: undefined,
  productName: 'test',
  productType: 'Orthophoto',
  additionalIdentifiers: '0,-90,180,903',
  taskCount: 1,
  completedTasks: 0,
  failedTasks: 0,
  expiredTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  abortedTasks: 0,
  tasks: [],
  created: '2022-08-29T07:06:05.043Z',
  updated: '2022-08-29T07:13:05.206Z',
};
