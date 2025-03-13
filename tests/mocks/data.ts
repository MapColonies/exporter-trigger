/* eslint-disable @typescript-eslint/no-magic-numbers */
import { RecordType } from '@map-colonies/mc-model-types';
import { BBox, Polygon } from 'geojson';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { RasterProductTypes, RoiFeatureCollection, TileFormatStrategy, TileOutputFormat, Transparency } from '@map-colonies/raster-shared';
import { CreateExportRequest } from '@src/utils/zod/schemas';
import {
  CreateExportJobBody,
  ICreateExportJobResponse,
  IExportInitRequest,
  IGeometryRecord,
  IJobStatusResponse,
  JobExportDuplicationParams,
} from '../../src/common/interfaces';
import { inProgressJobsResponse } from './processingRequest';

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

export const createExportRequestNoRoiWithCallback: CreateExportRequest = {
  dbId: catalogId,
  callbackUrlArray: ['http://callback1'],
};

export const createExportRequestWithRoiAndCallback: CreateExportRequest = {
  dbId: catalogId,
  callbackUrlArray: ['http://example.getmap.com/callback', 'http://example.getmap.com/callback2'],
  roi: defaultRoi,
};

export const createExportRequestWithRoiAndNewCallback: CreateExportRequest = {
  dbId: catalogId,
  callbackUrlArray: ['http://example.getmap.com/callback3'],
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
