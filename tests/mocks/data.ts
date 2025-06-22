/* eslint-disable @typescript-eslint/no-magic-numbers */
import { RecordType } from '@map-colonies/mc-model-types';
import { BBox, Polygon } from 'geojson';
import { IFindJobsRequest, IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import {
  CallbackExportResponse,
  ExportArtifactType,
  ExportJobParameters,
  RasterProductTypes,
  RoiFeatureCollection,
  TileFormatStrategy,
  TileOutputFormat,
  Transparency,
} from '@map-colonies/raster-shared';
import { CreateExportRequest } from '@src/utils/zod/schemas';
import {
  CreateExportJobBody,
  ICreateExportJobResponse,
  IExportInitRequest,
  IGeometryRecord,
  IJobStatusResponse,
  JobExportDuplicationParams,
  LayerInfo,
} from '../../src/common/interfaces';
import { inProgressJobsResponse } from './processingRequest';

type DateToString<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | undefined ? string | undefined : T[K];
};

const catalogId = '8b867544-2dab-43a1-be6e-f23ec83c19b4';
const crs = 'EPSG:4326';

const defaultRoi: RoiFeatureCollection = {
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
};

const notIntersectedPolygon: RoiFeatureCollection = {
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
            [34.94222600858711, 32.36620011311199],
            [34.957210576149464, 32.35918524263104],
            [34.95777020643541, 32.36966124266523],
            [34.94222600858711, 32.36620011311199],
          ],
        ],
      },
    },
  ],
};

export const getJobStatusByIdResponse: IJobStatusResponse = {
  percentage: inProgressJobsResponse[0].percentage,
  status: OperationStatus.IN_PROGRESS,
};

export const notContainedRoi: RoiFeatureCollection = {
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
            [-180, -90],
            [-180, 90],
            [180, 90],
            [180, -90],
            [-180, -90],
          ],
        ],
      },
    },
  ],
};

export const createExportData: IExportInitRequest = {
  crs: 'EPSG:4326',
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
              [-180, -90],
              [-180, 90],
              [180, 90],
              [180, -90],
              [-180, -90],
            ],
          ],
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
  fileNamesTemplates: {
    packageName: 'Orthophoto_SOME_NAME_1_0_0_2025_01_06T09_29_04_933Z.gpkg',
  },
  relativeDirectoryPath: 'e315e6d204d92b1d2dbfdaab96ff2a7e',
  packageRelativePath: 'e315e6d204d92b1d2dbfdaab96ff2a7e/Orthophoto_SOME_NAME_1_0_0_2025_01_06T09_29_04_933Z.gpkg',
  catalogId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
  version: '1.0',
  productId: 'SOME_NAME',
  productType: RasterProductTypes.ORTHOPHOTO,
  priority: 0,
  description: 'This is roi exporting example',
  targetFormat: TileOutputFormat.PNG,
  outputFormatStrategy: 'mixed',
  gpkgEstimatedSize: 1111,
  jobTrackerUrl: 'http://job-tracker',
  polygonPartsEntityName: 'some_name_orthophoto',
};

export function generateCreateJobRequest(createExportData: IExportInitRequest): CreateExportJobBody {
  return {
    resourceId: createExportData.productId,
    version: createExportData.version,
    type: 'Export',
    domain: 'RASTER',
    parameters: {
      exportInputParams: {
        roi: createExportData.roi,
        callbackUrls: createExportData.callbackUrls,
        crs: 'EPSG:4326',
      },
      additionalParams: {
        fileNamesTemplates: createExportData.fileNamesTemplates,
        relativeDirectoryPath: createExportData.relativeDirectoryPath,
        packageRelativePath: createExportData.packageRelativePath,
        outputFormatStrategy: createExportData.outputFormatStrategy,
        targetFormat: createExportData.targetFormat,
        gpkgEstimatedSize: createExportData.gpkgEstimatedSize,
        jobTrackerServiceURL: createExportData.jobTrackerUrl,
        polygonPartsEntityName: createExportData.polygonPartsEntityName,
      },
      cleanupDataParams: {
        directoryPath: createExportData.relativeDirectoryPath,
        cleanupExpirationTimeUTC: new Date('2025-03-28T00:00:00.000Z'),
      },
    },
    internalId: createExportData.catalogId,
    productType: createExportData.productType,
    priority: createExportData.priority,
    description: createExportData.description,
    status: OperationStatus.PENDING,
    percentage: 0,
    additionalIdentifiers: createExportData.relativeDirectoryPath,
    tasks: [
      {
        type: 'init',
        parameters: {
          blockDuplication: true,
        },
      },
    ],
  };
}

export const createJobResponse = {
  id: '15598cfc-a354-4eaa-b3f3-6029d40ddf6c',
};

export const initExportRequestBody = {
  resourceId: 'SOME_NAME',
  version: '1.0',
  type: 'Export',
  domain: 'RASTER',
  parameters: {
    exportInputParams: {
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
      callbackUrls: undefined,
      crs: 'EPSG:4326',
    },
    additionalParams: {
      fileNamesTemplates: {
        packageName: 'Orthophoto_SOME_NAME_1_0_0_2025_01_09T10_04_06_711Z.gpkg',
      },
      relativeDirectoryPath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
      packageRelativePath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7/Orthophoto_SOME_NAME_1_0_0_2025_01_09T10_04_06_711Z.gpkg',
      outputFormatStrategy: TileFormatStrategy.MIXED,
      targetFormat: TileOutputFormat.PNG,
      gpkgEstimatedSize: 12500,
      jobTrackerServiceURL: 'http://job-tracker',
      polygonPartsEntityName: 'some_name_orthophoto',
    },
    cleanupDataParams: {
      directoryPath: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
      cleanupExpirationTimeUTC: '2025_01_09T10_04_06_711Z',
    },
  },
  internalId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
  productType: RasterProductTypes.ORTHOPHOTO,
  priority: 1000,
  description: undefined,
  status: OperationStatus.PENDING,
  percentage: 0,
  additionalIdentifiers: '63baedae-cb5b-4c0a-a7db-8eb6b9105cb7',
  tasks: [
    {
      type: 'init',
      parameters: {
        blockDuplication: true,
      },
    },
  ],
};

export const initExportResponse = {
  id: 'ef1a76e2-3a4b-49e6-90ee-e97c402dd3d8',
};

export const initExportRequestBodyNoRoiWithCallback = {
  resourceId: 'SOME_NAME',
  version: '1.0',
  type: 'Export',
  domain: 'RASTER',
  parameters: {
    exportInputParams: {
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
              bbox: [34.85149443279957, 32.29430955805424, 34.86824157112912, 32.30543192283443],
              coordinates: [
                [
                  [34.85149445922802, 32.29430958448269],
                  [34.85149443279957, 32.2943098528153],
                  [34.85149443279957, 32.305431628073364],
                  [34.85149445922802, 32.30543189640598],
                  [34.851494727560635, 32.30543192283443],
                  [34.86824127636805, 32.30543192283443],
                  [34.868241544700666, 32.30543189640598],
                  [34.86824157112912, 32.305431628073364],
                  [34.86824157112912, 32.2943098528153],
                  [34.868241544700666, 32.29430958448269],
                  [34.86824127636805, 32.29430955805424],
                  [34.851494727560635, 32.29430955805424],
                  [34.85149445922802, 32.29430958448269],
                ],
              ],
            },
          },
        ],
      },
      callbackUrls: [
        {
          url: 'http://callback1',
        },
      ],
      crs: 'EPSG:4326',
    },
    additionalParams: {
      fileNamesTemplates: {
        packageName: 'Orthophoto_SOME_NAME_1_0_0_2025_01_09T12_39_36_961Z.gpkg',
      },
      relativeDirectoryPath: 'b30e5a99b78a6c10e65164fd54b14ad0',
      packageRelativePath: 'b30e5a99b78a6c10e65164fd54b14ad0/Orthophoto_SOME_NAME_1_0_0_2025_01_09T12_39_36_961Z.gpkg',
      outputFormatStrategy: TileFormatStrategy.MIXED,
      targetFormat: TileOutputFormat.PNG,
      gpkgEstimatedSize: 12500,
      jobTrackerServiceURL: 'http://job-tracker',
      polygonPartsEntityName: 'some_name_orthophoto',
    },
    cleanupDataParams: {
      directoryPath: 'b30e5a99b78a6c10e65164fd54b14ad0',
      cleanupExpirationTimeUTC: '2025_01_09T12_39_36_961Z',
    },
  },
  internalId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
  productType: 'Orthophoto',
  priority: 1000,
  description: undefined,
  status: 'Pending',
  percentage: 0,
  additionalIdentifiers: 'b30e5a99b78a6c10e65164fd54b14ad0',
  tasks: [
    {
      type: 'init',
      parameters: {
        blockDuplication: true,
      },
    },
  ],
};

export const layerInfo = {
  links: [
    {
      name: 'SOME_NAME-Orthophoto',
      protocol: 'WMS',
      url: 'https://tiles-dev.mapcolonies.net/api/raster/v1/service?REQUEST=GetCapabilities',
    },
    {
      name: 'SOME_NAME-Orthophoto',
      protocol: 'WMS_BASE',
      url: 'https://tiles-dev.mapcolonies.net/api/raster/v1/wms',
    },
    {
      name: 'SOME_NAME-Orthophoto',
      protocol: 'WMTS',
      url: 'https://tiles-dev.mapcolonies.net/api/raster/v1/wmts/1.0.0/WMTSCapabilities.xml',
    },
    {
      name: 'SOME_NAME-Orthophoto',
      protocol: 'WMTS_KVP',
      url: 'https://tiles-dev.mapcolonies.net/api/raster/v1/service?REQUEST=GetCapabilities&SERVICE=WMTS',
    },
    {
      name: 'SOME_NAME-Orthophoto',
      protocol: 'WMTS_BASE',
      url: 'https://tiles-dev.mapcolonies.net/api/raster/v1/wmts',
    },
    {
      name: 'SOME_NAME-Orthophoto',
      protocol: 'WFS',
      url: 'https://polygon-parts-dev.mapcolonies.net/api/raster/v1/wfs?request=GetCapabilities',
    },
  ],
  metadata: {
    id: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
    type: RecordType.RECORD_RASTER,
    classification: '6',
    productName: 'string',
    description: 'string',
    srs: '4326',
    producerName: 'string',
    creationDateUTC: '2025-01-02T11:51:18.140Z',
    ingestionDate: '2025-01-02T11:51:18.140Z',
    updateDateUTC: '2025-01-02T09:51:18.140Z',
    imagingTimeBeginUTC: '2024-01-28T13:47:43.427Z',
    imagingTimeEndUTC: '2024-01-28T13:47:43.427Z',
    maxHorizontalAccuracyCE90: 10,
    minHorizontalAccuracyCE90: 10,
    sensors: ['string'],
    region: ['string'],
    productId: 'SOME_NAME',
    productVersion: '1.0',
    productType: RasterProductTypes.ORTHOPHOTO,
    productSubType: 'string',
    srsName: 'WGS84GEO',
    maxResolutionDeg: 0.703125,
    minResolutionDeg: 0.703125,
    maxResolutionMeter: 8000,
    minResolutionMeter: 8000,
    scale: 100000000,
    footprint: {
      type: 'Polygon',
      bbox: [34.85149443279957, 32.29430955805424, 34.86824157112912, 32.30543192283443],
      coordinates: [
        [
          [34.85149445922802, 32.29430958448269],
          [34.85149443279957, 32.2943098528153],
          [34.85149443279957, 32.305431628073364],
          [34.85149445922802, 32.30543189640598],
          [34.851494727560635, 32.30543192283443],
          [34.86824127636805, 32.30543192283443],
          [34.868241544700666, 32.30543189640598],
          [34.86824157112912, 32.305431628073364],
          [34.86824157112912, 32.2943098528153],
          [34.868241544700666, 32.29430958448269],
          [34.86824127636805, 32.29430955805424],
          [34.851494727560635, 32.29430955805424],
          [34.85149445922802, 32.29430958448269],
        ],
      ],
    },
    productBoundingBox: '34.851494432799569,32.294309558054238,34.868241571129118,32.305431922834430',
    displayPath: 'f76fde12-121d-4b66-b5b9-732ef92e2eda',
    transparency: Transparency.TRANSPARENT,
    tileMimeFormat: 'image/png',
    tileOutputFormat: TileOutputFormat.PNG,
  },
};

export const fcTooHighResolution: RoiFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.000000335276126861572, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [37.42414218385065, 17.95036866237062],
            [30.42608533411871, 17.95036866237062],
            [30.42608533411871, 11.52904501530621],
            [37.42414218385065, 11.52904501530621],
            [37.42414218385065, 17.95036866237062],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const fc1: RoiFeatureCollection = {
  ...fcTooHighResolution,

  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [37.42414218385065, 17.95036866237062],
            [30.42608533411871, 17.95036866237062],
            [30.42608533411871, 11.52904501530621],
            [37.42414218385065, 11.52904501530621],
            [37.42414218385065, 17.95036866237062],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [29.726720838716574, -10.646156974961286],
            [25.120393802953117, -10.646156974961286],
            [25.120393802953117, -16.979479051947962],
            [29.726720838716574, -16.979479051947962],
            [29.726720838716574, -10.646156974961286],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const validateFeatureCollection = {
  validRequest: {
    featuresRecords: [
      {
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-90, -90],
              [90, -90],
              [90, 90],
              [-90, 90],
              [-90, -90],
            ],
          ],
        },
        targetResolutionDeg: 0.703125,
        targetResolutionMeter: 78271.52,
        minResolutionDeg: 0.703125,
        minZoomLevel: 0,
        zoomLevel: 0,
      },
    ] as IGeometryRecord[],
    footprint: {
      type: 'Polygon',
      bbox: [-180, -90, 180, 90],
      coordinates: [
        [
          [-180, -90],
          [-180, 90],
          [180, 90],
          [180, -90],
          [-180, -90],
        ],
      ],
    } as Polygon,
    maxZomm: 0,
    srcRes: 0.703125,
    sanitizedBox: [-180, -90, 180, 90] as BBox,
  },
  invalid: {
    notIntersected: {
      featuresRecords: [
        {
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-146.80460864627938, -55.00665477606888],
                [-121.46405521949563, -55.00665477606888],
                [-121.46405521949563, -44.35618678215676],
                [-146.80460864627938, -44.35618678215676],
                [-146.80460864627938, -55.00665477606888],
              ],
            ],
          },
          targetResolutionDeg: 0.703125,
          targetResolutionMeter: 78271.52,
          minResolutionDeg: 0.703125,
          minZoomLevel: 0,
          zoomLevel: 0,
        },
      ] as IGeometryRecord[],
      footprint: {
        type: 'Polygon',
        bbox: [-90, -90, 90, 90],
        coordinates: [
          [
            [-90, -90],
            [90, -90],
            [90, 90],
            [-90, 90],
            [-90, -90],
          ],
        ],
      } as Polygon,
      maxZomm: 0,
      srcRes: 0.703125,
    },
  },
};

// Constants
export const dupParams = {
  productId: 'SOME_NAME',
  version: '1.0',
  catalogId,
  roi: defaultRoi,
  crs,
} as JobExportDuplicationParams;

export const createExportRequestWithoutCallback: CreateExportRequest = {
  dbId: catalogId,
  crs,
  roi: defaultRoi,
};

export const createExportRequestWithoutRoi: CreateExportRequest = {
  dbId: catalogId,
  crs,
};
export const createExportRequestNoRoiWithCallback: CreateExportRequest = {
  dbId: catalogId,
  callbackURLs: ['http://callback1'],
};

export const createExportRequestWithRoiAndCallback: CreateExportRequest = {
  dbId: catalogId,
  callbackURLs: ['http://example.getmap.com/callback', 'http://example.getmap.com/callback2'],
  roi: defaultRoi,
};

export const createExportRequestWithRoiAndNewCallback: CreateExportRequest = {
  dbId: catalogId,
  callbackURLs: ['http://example.getmap.com/callback3'],
  roi: defaultRoi,
};

export const createExportInvalidMaxZoomLevel: CreateExportRequest = {
  dbId: catalogId,
  crs,
  roi: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          maxResolutionDeg: 0.0439453125,
          minResolutionDeg: 0.703125,
        },
        geometry: defaultRoi.features[0].geometry,
      },
    ],
  },
};

export const createExportInvalidMinZoomLevel: CreateExportRequest = {
  dbId: catalogId,
  crs,
  roi: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          maxResolutionDeg: 0.703125,
          minResolutionDeg: 0.1,
        },
        geometry: defaultRoi.features[0].geometry,
      },
    ],
  },
};

export const createExportNotIntersectedPolygon: CreateExportRequest = {
  dbId: catalogId,
  crs,
  roi: notIntersectedPolygon,
};

export const createExportResponse: ICreateExportJobResponse = {
  jobId: 'ef1a76e2-3a4b-49e6-90ee-e97c402dd3d8',
  status: OperationStatus.PENDING,
};

export const layerMetadataResponse: LayerInfo = {
  metadata: {
    type: RecordType.RECORD_RASTER,
    description: 'string',
    producerName: 'string',
    productSubType: 'string',
    srsName: 'WGS84GEO',
    scale: 100000000,
    productBoundingBox: '-180.000000000000000,-89.999999973571548,179.999999973571533,89.999999973571548',
    classification: '6',
    id: '7494fdc8-5898-4a85-babe-27f6f4a937b7',
    srs: '4326',
    productVersion: '1.0',
    maxResolutionDeg: 0.02197265625,
    minResolutionDeg: 0.02197265625,
    rms: 0,
    creationDateUTC: new Date('2025-05-19T08:39:37.486Z'),
    ingestionDate: new Date('2025-05-19T08:39:37.486Z'),
    minHorizontalAccuracyCE90: 10,
    maxHorizontalAccuracyCE90: 10,
    region: ['string'],
    sensors: ['string'],
    imagingTimeBeginUTC: new Date('2024-01-28T13:47:43.427Z'),
    imagingTimeEndUTC: new Date('2024-01-28T13:47:43.427Z'),
    updateDateUTC: new Date('2025-05-19T05:39:37.486Z'),
    maxResolutionMeter: 8000,
    minResolutionMeter: 8000,
    displayPath: 'dd0b2205-a79c-421d-8e06-d12d52118689',
    transparency: 'TRANSPARENT',
    tileMimeFormat: 'image/png',
    tileOutputFormat: 'PNG',
    productName: '2Parts',
    productId: 'Naive_Cache_Check_V2',
    productType: RasterProductTypes.ORTHOPHOTO,
    footprint: {
      type: 'Polygon',
      coordinates: [
        [
          [-180, 89.99999970523892],
          [179.99999997357153, 89.99999997357155],
          [179.99999997357153, -89.99999997357155],
          [-179.99999997357153, -89.99999997357155],
          [-180, 89.99999970523892],
        ],
      ],
      bbox: [-180, -89.99999997357155, 179.99999997357153, 89.99999997357155],
    },
  },
  links: [],
};

export const roiRequest: CreateExportRequest = {
  dbId: '7494fdc8-5898-4a85-babe-27f6f4a937b7',
  roi: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          maxResolutionDeg: 0.087890625,
          minResolutionDeg: 0.703125,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [34.479280463428466, 31.472217896295774],
              [34.480316474833614, 31.470300615520685],
              [34.482525329337875, 31.47145098869808],
              [34.479280463428466, 31.472217896295774],
            ],
          ],
        },
      },
    ],
  },
  callbackURLs: ['https://webhook-test.com'],
  crs: 'EPSG:4326',
  priority: 0,
  description: '',
};

export const duplicationParams: IFindJobsRequest = {
  resourceId: 'Naive_Cache_Check_V2',
  version: '1.0',
  isCleaned: false,
  type: 'Export',
  shouldReturnTasks: false,
  status: OperationStatus.COMPLETED,
};

export const duplicateJobsResponseWithoutParams: IJobResponse<unknown, unknown>[] = [
  {
    id: '4bebe2f8-5bb2-489a-8341-b80e0f704d40',
    resourceId: 'Naive_Cache_Check_V2',
    version: '1.0',
    type: 'Export',
    parameters: {},
    description: 'Max zoom:1',
    status: OperationStatus.COMPLETED,
    percentage: 100,
    reason: 'Job completed successfully',
    domain: 'RASTER',
    isCleaned: false,
    priority: 0,
    expirationDate: undefined,
    internalId: '7494fdc8-5898-4a85-babe-27f6f4a937b7',
    producerName: undefined,
    productName: undefined,
    productType: 'Orthophoto',
    additionalIdentifiers: '6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd',
    taskCount: 3,
    completedTasks: 3,
    failedTasks: 0,
    expiredTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    abortedTasks: 0,
    created: '2025-05-19T10:13:41.801Z',
    updated: '2025-05-19T10:15:51.403Z',
  },
];

export const duplicateJobResponseWithParams: IJobResponse<ExportJobParameters, unknown> = {
  ...duplicateJobsResponseWithoutParams[0],
  parameters: {
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
                  [34.479280463428466, 31.472217896295774],
                  [34.480316474833614, 31.470300615520685],
                  [34.482525329337875, 31.47145098869808],
                  [34.479280463428466, 31.472217896295774],
                ],
              ],
            },
            properties: {
              maxResolutionDeg: 0.087890625,
              minResolutionDeg: 0.703125,
            },
          },
        ],
      },
      jobId: '4bebe2f8-5bb2-489a-8341-b80e0f704d40',
      links: {
        dataURI: 'http://download-server//downloads/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.gpkg',
        metadataURI: 'http://download-server//downloads/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.json',
      },
      status: OperationStatus.COMPLETED,
      fileSize: 102400,
      artifacts: [
        {
          url: 'http://download-server//downloads/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.gpkg',
          name: 'test.gpkg',
          size: 102400,
          type: ExportArtifactType.GPKG,
          sha256: '8fca0427fcc4f57cadb3799ad44d621333716c3515ccf7d15208dae0aba6adb0',
        },
        {
          url: 'http://download-server//downloads/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.json',
          name: 'test.json',
          size: 1834,
          type: ExportArtifactType.METADATA,
        },
      ],
      description: 'The export process completed successfully.',
      expirationTime: new Date('2025-06-18T10:15:50.000Z'),
      recordCatalogId: '7494fdc8-5898-4a85-babe-27f6f4a937b7',
    },
    additionalParams: {
      targetFormat: 'PNG',
      gpkgEstimatedSize: 25000,
      fileNamesTemplates: {
        packageName: 'test.gpkg',
      },
      packageRelativePath: '6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.gpkg',
      jobTrackerServiceURL: 'http://job-tracker',
      outputFormatStrategy: 'mixed',
      relativeDirectoryPath: '6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd',
      polygonPartsEntityName: 'naive_cache_check_v2_orthophoto',
    },
    cleanupDataParams: {
      directoryPath: '/outputs/gpkgs/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd',
      cleanupExpirationTimeUTC: new Date('2025-06-18T10:15:50.000Z'),
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
                  [34.479280463428466, 31.472217896295774],
                  [34.480316474833614, 31.470300615520685],
                  [34.482525329337875, 31.47145098869808],
                  [34.479280463428466, 31.472217896295774],
                ],
              ],
            },
            properties: {
              maxResolutionDeg: 0.087890625,
              minResolutionDeg: 0.703125,
            },
          },
        ],
      },
      callbackUrls: [
        {
          url: 'https://webhook-test.com/7e3bb99c19bea30ac50fcf479802d569',
        },
      ],
    },
  },
};

export const expectedResponse: DateToString<CallbackExportResponse> = {
  roi: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [34.479280463428466, 31.472217896295774],
              [34.480316474833614, 31.470300615520685],
              [34.482525329337875, 31.47145098869808],
              [34.479280463428466, 31.472217896295774],
            ],
          ],
        },
        properties: {
          maxResolutionDeg: 0.087890625,
          minResolutionDeg: 0.703125,
        },
      },
    ],
  },
  jobId: '4bebe2f8-5bb2-489a-8341-b80e0f704d40',
  links: {
    dataURI: 'http://download-server//downloads/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.gpkg',
    metadataURI: 'http://download-server//downloads/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.json',
  },
  status: OperationStatus.COMPLETED,
  fileSize: 102400,
  artifacts: [
    {
      url: 'http://download-server//downloads/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.gpkg',
      name: 'test.gpkg',
      size: 102400,
      type: ExportArtifactType.GPKG,
      sha256: '8fca0427fcc4f57cadb3799ad44d621333716c3515ccf7d15208dae0aba6adb0',
    },
    {
      url: 'http://download-server//downloads/6f2a4f2c-72d0-4a52-a9ff-b4c7b833d6fd/test.json',
      name: 'test.json',
      size: 1834,
      type: ExportArtifactType.METADATA,
    },
  ],
  description: 'The export process completed successfully.',
  expirationTime: '2025-06-18T10:15:50.000Z',
  recordCatalogId: '7494fdc8-5898-4a85-babe-27f6f4a937b7',
};

export interface Test {
  description: string;
  request: CreateExportRequest;
  findLayerParams: { id: string };
  layerMetadataResponse: LayerInfo[];
  duplicationParams: IFindJobsRequest;
  duplicateJobsResponseWithoutParams: IJobResponse<unknown, unknown>[];
  duplicateJobResponseWithParams: IJobResponse<ExportJobParameters, unknown>;
  expected: DateToString<CallbackExportResponse>;
}

export const createExportDuplicateResponseTestCases: Test[] = [
  {
    description: 'Should return existing completed job when ROI exactly matches',
    request: roiRequest,
    findLayerParams: { id: layerMetadataResponse.metadata.id },
    layerMetadataResponse: [layerMetadataResponse],
    duplicationParams: duplicationParams,
    duplicateJobsResponseWithoutParams,
    duplicateJobResponseWithParams,
    expected: expectedResponse,
  },
  {
    description: 'Should return existing completed job when ROI coordinates are similar but within buffer threshold',
    request: {
      ...roiRequest,
      roi: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              maxResolutionDeg: 0.087890625,
              minResolutionDeg: 0.703125,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  // Slightly modified coordinates (about 1m difference)
                  [34.4792805, 31.472218],
                  [34.4803165, 31.4703007],
                  [34.4825254, 31.4714511],
                  [34.4792805, 31.472218],
                ],
              ],
            },
          },
        ],
      },
    },
    findLayerParams: { id: layerMetadataResponse.metadata.id },
    layerMetadataResponse: [layerMetadataResponse],
    duplicationParams: duplicationParams,
    duplicateJobsResponseWithoutParams,
    duplicateJobResponseWithParams,
    expected: expectedResponse,
  },
];
