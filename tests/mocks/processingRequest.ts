/* eslint-disable @typescript-eslint/no-magic-numbers */
import { IFindJobsByCriteriaBody, IFindJobsRequest, OperationStatus } from '@map-colonies/mc-priority-queue';
import { CallbackUrlsTargetArray, TileFormatStrategy, TileOutputFormat } from '@map-colonies/raster-shared';
import { JobExportDuplicationParams } from '@src/common/interfaces';

export const processingDupParams = {
  productId: 'SOME_NAME',
  version: '1.0',
  dbId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
  roi: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          maxResolutionDeg: 0.703125,
          minResolutionDeg: 0.703125,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [34.85671849225366, 32.306563240778644],
              [34.858090125180894, 32.30241218787266],
              [34.862337900781455, 32.30263664191864],
              [34.86154145051941, 32.30708703329364],
              [34.85671849225366, 32.306563240778644],
            ],
          ],
        },
      },
    ],
  },
  crs: 'EPSG:4326',
} as unknown as JobExportDuplicationParams;

export const inProgressExportParams = {
  resourceId: processingDupParams.productId,
  version: processingDupParams.version,
  isCleaned: false,
  type: 'Export',
  shouldReturnTasks: false,
  status: 'In-Progress',
} as IFindJobsRequest;

export const pendingExportParams = {
  resourceId: processingDupParams.productId,
  version: processingDupParams.version,
  isCleaned: false,
  type: 'Export',
  shouldReturnTasks: false,
  status: 'Pending',
} as IFindJobsRequest;

export const inProgressJobsResponse = [
  {
    id: '70c29b11-1bfd-4e43-a76a-ca3ab5d7b511',
    resourceId: 'SOME_NAME',
    version: '1.0',
    type: 'Export',
    description: 'This is roi exporting example',
    parameters: {
      additionalParams: {
        fileNamesTemplates: {
          dataURI: 'Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_00_02_621Z.gpkg',
        },
        packageRelativePath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_00_02_621Z.gpkg',
        relativeDirectoryPath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
        outputFormatStrategy: TileFormatStrategy.MIXED,
        targetFormat: TileOutputFormat.PNG,
        gpkgEstimatedSize: 11111,
      },
      exportInputParams: {
        crs: 'EPSG:4326',
        roi: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [34.85671849225366, 32.306563240778644],
                    [34.858090125180894, 32.30241218787266],
                    [34.862337900781455, 32.30263664191864],
                    [34.86154145051941, 32.30708703329364],
                    [34.85671849225366, 32.306563240778644],
                  ],
                ],
              },
              properties: {
                maxResolutionDeg: 0.703125,
                minResolutionDeg: 0.703125,
              },
            },
          ],
        },
        callbackUrls: [
          {
            url: 'http://example.getmap.com/callback',
          },
          {
            url: 'http://example.getmap.com/callback2',
          },
        ],
      },
    },
    status: 'In-Progress',
    percentage: 4,
    reason: '',
    domain: 'RASTER',
    isCleaned: false,
    priority: 0,
    expirationDate: null,
    internalId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
    producerName: null,
    productName: 'SOME_NAME',
    productType: 'Orthophoto',
    additionalIdentifiers: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
    taskCount: 1,
    completedTasks: 0,
    failedTasks: 0,
    expiredTasks: 0,
    pendingTasks: 1,
    inProgressTasks: 0,
    abortedTasks: 0,
    tasks: [
      {
        id: '127610c6-b4ed-4fda-ab02-95356cb34801',
        jobId: '70c29b11-1bfd-4e43-a76a-ca3ab5d7b511',
        type: 'init',
        description: '',
        parameters: {
          blockDuplication: true,
        },
        status: 'Pending',
        percentage: 0,
        reason: '',
        attempts: 0,
        resettable: true,
        blockDuplication: false,
        created: '2025-01-02T12:00:02.826Z',
        updated: '2025-01-02T12:00:02.826Z',
      },
    ],
    created: '2025-01-02T12:00:02.826Z',
    updated: '2025-01-02T12:00:02.826Z',
  },
  {
    id: '18842968-303b-4dd2-9aae-97cadcf71fa9',
    resourceId: 'SOME_NAME',
    version: '1.0',
    type: 'Export',
    description: 'This is roi exporting example',
    parameters: {
      additionalParams: {
        fileNamesTemplates: {
          dataURI: 'Orthophoto_SOME_NAME_1_0_0_2025_01_05T09_37_40_928Z.gpkg',
        },
        packageRelativePath: '65adbc306ad555ca82ca12df9153dee1/Orthophoto_SOME_NAME_1_0_0_2025_01_05T09_37_40_928Z.gpkg',
        relativeDirectoryPath: '65adbc306ad555ca82ca12df9153dee1',
        outputFormatStrategy: TileFormatStrategy.MIXED,
        targetFormat: TileOutputFormat.PNG,
        gpkgEstimatedSize: 11111,
      },
      exportInputParams: {
        crs: 'EPSG:4326',
        roi: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [34.85297286402562, 32.302696044316704],
                    [34.852259515541164, 32.29881029412613],
                    [34.857834201843104, 32.29818498543037],
                    [34.86047623326613, 32.30229407788441],
                    [34.85297286402562, 32.302696044316704],
                  ],
                ],
              },
              properties: {
                maxResolutionDeg: 0.703125,
                minResolutionDeg: 0.703125,
              },
            },
          ],
        },
        callbackUrls: [
          {
            url: 'http://example.getmap.com/callback',
          },
          {
            url: 'http://example.getmap.com/callback2',
          },
        ],
      },
    },
    status: 'In-Progress',
    percentage: 0,
    reason: '',
    domain: 'RASTER',
    isCleaned: false,
    priority: 0,
    expirationDate: null,
    internalId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
    producerName: null,
    productName: 'SOME_NAME',
    productType: 'Orthophoto',
    additionalIdentifiers: '65adbc306ad555ca82ca12df9153dee1',
    taskCount: 1,
    completedTasks: 0,
    failedTasks: 0,
    expiredTasks: 0,
    pendingTasks: 1,
    inProgressTasks: 0,
    abortedTasks: 0,
    tasks: [
      {
        id: 'c33eaf27-3ecd-4238-bab2-58c81e55c83a',
        jobId: '18842968-303b-4dd2-9aae-97cadcf71fa9',
        type: 'init',
        description: '',
        parameters: {
          blockDuplication: true,
        },
        status: 'Pending',
        percentage: 0,
        reason: '',
        attempts: 0,
        resettable: true,
        blockDuplication: false,
        created: '2025-01-05T09:37:41.138Z',
        updated: '2025-01-05T09:37:41.138Z',
      },
    ],
    created: '2025-01-05T09:37:41.138Z',
    updated: '2025-01-05T09:37:41.138Z',
  },
];

export const processingResponse = {
  jobId: inProgressJobsResponse[0].id,
  percentage: inProgressJobsResponse[0].percentage,
  status: OperationStatus.IN_PROGRESS,
  isDuplicated: true,
};

export const addedCallbackUrl: CallbackUrlsTargetArray = [
  {
    url: 'http://example.getmap.com/callback3',
  },
];

export const findCriteria: IFindJobsByCriteriaBody = {
  isCleaned: false,
  types: ['Export'],
  shouldReturnTasks: false,
  statuses: [OperationStatus.IN_PROGRESS, OperationStatus.PENDING],
  domain: 'RASTER',
};
