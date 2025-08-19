/* eslint-disable @typescript-eslint/no-magic-numbers */
import { IFindJobsRequest, OperationStatus } from '@map-colonies/mc-priority-queue';
import { getUTCDate } from '@map-colonies/mc-utils';
import { TileFormatStrategy, TileOutputFormat } from '@map-colonies/raster-shared';
import { dupParams } from './data';

export const completedExportParams = {
  resourceId: dupParams.productId,
  version: dupParams.version,
  isCleaned: false,
  type: 'Export',
  shouldReturnTasks: false,
  status: 'Completed',
} as IFindJobsRequest;

export const completedExportJobsResponse = [
  {
    id: '8eddc842-64ee-4e90-b3a5-b10d9e86acb2',
    resourceId: 'SOME_NAME',
    version: '1.0',
    type: 'Export',
    description: 'This is roi exporting example',
    parameters: {
      cleanupDataParams: {
        directoryPath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
        cleanupExpirationTimeUTC: '2029-02-01T12:28:50.000Z',
      },
      callbackParams: {
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
        jobId: '8eddc842-64ee-4e90-b3a5-b10d9e86acb2',
        links: {
          dataURI: 'http://download-service/downloads/63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.gpkg',
        },
        status: OperationStatus.COMPLETED,
        fileSize: 77824,
        artifacts: [
          {
            url: 'http://download-service/downloads/63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.gpkg',
            name: 'Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.gpkg',
            size: 77824,
            type: 'GPKG',
          },
          {
            url: 'http://download-service/downloads/63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.json',
            name: 'Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.json',
            size: 1312,
            type: 'METADATA',
          },
        ],
        description: 'This is roi exporting example',
        expirationTime: '2029-02-01T12:28:50.000Z',
        recordCatalogId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
      },
      additionalParams: {
        fileNamesTemplates: {
          dataURI: 'Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_00_02_621Z.gpkg',
        },
        packageRelativePath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_00_02_621Z.gpkg',
        relativeDirectoryPath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
        outputFormatStrategy: TileFormatStrategy.MIXED,
        targetFormat: TileOutputFormat.PNG,
        gpkgEstimatedSize: 11111,
        jobTrackerServiceURL: 'http://job-tracker',
        polygonPartsEntityName: 'some_name_orthophoto',
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
    status: OperationStatus.COMPLETED,
    percentage: 100,
    reason: '',
    domain: 'RASTER',
    isCleaned: false,
    priority: 0,
    internalId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
    productName: 'SOME_NAME',
    productType: 'Orthophoto',
    additionalIdentifiers: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
    taskCount: 2,
    completedTasks: 2,
    failedTasks: 0,
    expiredTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    abortedTasks: 0,
    created: '2025-01-02T12:22:56.284Z',
    updated: '2025-01-02T12:28:50.505Z',
  },
  {
    id: '8eddc842-64ee-4e90-b3a5-b10d9e86acb2',
    resourceId: 'SOME_NAME',
    version: '1.0',
    type: 'Export',
    description: 'This is roi exporting example',
    parameters: {
      cleanupDataParams: {
        directoryPath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
        cleanupExpirationTimeUTC: new Date('2025-02-01T12:28:50.000Z'),
      },
      callbackParams: {
        roi: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [34.639025450061524, 31.79792172001403],
                    [34.646806709831, 31.79792172001403],
                    [34.646806709831, 31.80140460744333],
                    [34.639025450061524, 31.80140460744333],
                    [34.639025450061524, 31.79792172001403],
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
        jobId: '8eddc842-64ee-4e90-b3a5-b10d9e86acb1',
        links: {
          dataURI: 'http://download-service/downloads/63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.gpkg',
        },
        status: OperationStatus.COMPLETED,
        fileSize: 77824,
        artifacts: [
          {
            url: 'http://download-service/downloads/63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.gpkg',
            name: 'Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.gpkg',
            size: 77824,
            type: 'GPKG',
          },
          {
            url: 'http://download-service/downloads/63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.json',
            name: 'Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_22_56_272Z.json',
            size: 1312,
            type: 'METADATA',
          },
        ],
        description: 'This is roi exporting example',
        expirationTime: '2025-02-01T12:28:50.000Z',
        recordCatalogId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
      },
      additionalParams: {
        fileNamesTemplates: {
          dataURI: 'Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_00_02_621Z.gpkg',
        },
        packageRelativePath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_02T12_00_02_621Z.gpkg',
        relativeDirectoryPath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
        outputFormatStrategy: TileFormatStrategy.MIXED,
        targetFormat: TileOutputFormat.PNG,
        gpkgEstimatedSize: 11111,
        jobTrackerServiceURL: 'http://job-tracker',
        polygonPartsEntityName: 'some_name_orthophoto',
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
                    [34.639025450061524, 31.79792172001403],
                    [34.646806709831, 31.79792172001403],
                    [34.646806709831, 31.80140460744333],
                    [34.639025450061524, 31.80140460744333],
                    [34.639025450061524, 31.79792172001403],
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
    status: OperationStatus.COMPLETED,
    percentage: 100,
    reason: '',
    domain: 'RASTER',
    isCleaned: false,
    priority: 0,
    internalId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
    productName: 'SOME_NAME',
    productType: 'Orthophoto',
    additionalIdentifiers: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
    taskCount: 2,
    completedTasks: 2,
    failedTasks: 0,
    expiredTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    abortedTasks: 0,
    created: '2025-01-02T12:22:56.284Z',
    updated: '2025-01-02T12:28:50.505Z',
  },
];

export const completedExportJobsResponseWithBufferedRoi = [
  {
    ...completedExportJobsResponse[0],
    parameters: {
      ...completedExportJobsResponse[0].parameters,
      exportInputParams: {
        ...completedExportJobsResponse[0].parameters.exportInputParams,
        roi: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [34.85674548920005, 32.30655137739643],
                    [34.858100499442344, 32.30243096524444],
                    [34.86232390679237, 32.302638641426896],
                    [34.86153951511287, 32.30707719844892],
                    [34.85674548920005, 32.30655137739643],
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
      },
    },
  },
];

export const completedExportJobWithMultiPolygonResponse = [
  {
    ...completedExportJobsResponse[0],
    parameters: {
      ...completedExportJobsResponse[0].parameters,
      exportInputParams: {
        ...completedExportJobsResponse[0].parameters.exportInputParams,
        roi: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'MultiPolygon',
                coordinates: [
                  [
                    [
                      [34.85671849225366, 32.306563240778644],
                      [34.858090125180894, 32.30241218787266],
                      [34.862337900781455, 32.30263664191864],
                      [34.86154145051941, 32.30708703329364],
                      [34.85671849225366, 32.306563240778644],
                    ],
                  ],
                  [
                    [
                      [34.87, 32.31],
                      [34.88, 32.31],
                      [34.88, 32.32],
                      [34.87, 32.32],
                      [34.87, 32.31],
                    ],
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
      },
    },
  },
];

export const completedExportJobWithMultiPolygonRoiForMultiPolygonLayer = [
  {
    ...completedExportJobsResponse[0],
    parameters: {
      ...completedExportJobsResponse[0].parameters,
      exportInputParams: {
        ...completedExportJobsResponse[0].parameters.exportInputParams,
        roi: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'MultiPolygon',
                coordinates: [
                  [
                    [
                      [34.85671849225366, 32.306563240778644],
                      [34.858090125180894, 32.30241218787266],
                      [34.862337900781455, 32.30263664191864],
                      [34.86154145051941, 32.30708703329364],
                      [34.85671849225366, 32.306563240778644],
                    ],
                  ],
                  [
                    [
                      [34.85665225898083, 32.306571066376634],
                      [34.85801528568973, 32.30236857700437],
                      [34.86239653319174, 32.30260060006512],
                      [34.86165826981073, 32.3071650263976],
                      [34.85665225898083, 32.306571066376634],
                    ],
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
      },
    },
  },
];

export const updateCompletedExpirationParams = {
  parameters: {
    ...completedExportJobsResponse[0].parameters,
    cleanupDataParams: {
      ...completedExportJobsResponse[0].parameters.cleanupDataParams,
      cleanupExpirationTimeUTC: new Date(getUTCDate().getDate() + 30),
      directoryPath: completedExportJobsResponse[0].parameters.cleanupDataParams.directoryPath,
    },
  },
};

export const completedJobCallback = {
  ...completedExportJobsResponse[0].parameters.callbackParams,
  status: OperationStatus.COMPLETED,
};

export const completedJobCallbackWithMultiPolygon = {
  ...completedExportJobWithMultiPolygonResponse[0].parameters.callbackParams,
  status: OperationStatus.COMPLETED,
};

export const completedJobCallbackWithBufferedRoi = {
  ...completedExportJobsResponseWithBufferedRoi[0].parameters.callbackParams,
  status: OperationStatus.COMPLETED,
};
