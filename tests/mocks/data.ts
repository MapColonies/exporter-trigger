/* eslint-disable */
import { LayerMetadata, ProductType, RecordType, TileOutputFormat } from '@map-colonies/mc-model-types';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { FeatureCollection } from '@turf/helpers';
import {
  ExportVersion,
  ICreatePackage,
  IJobExportParameters,
  IJobParameters,
  ITaskParameters,
  IWorkerExportInput,
  IWorkerInput,
} from '../../src/common/interfaces';

const layerMetadata: LayerMetadata = {
  type: 'RECORD_RASTER',
  classification: 'string',
  productName: 'string',
  description: 'string',
  srsId: 'string',
  producerName: 'string',
  creationDate: '2021-12-23T15:09:28.941Z',
  ingestionDate: '2021-12-23T15:09:28.941Z',
  updateDate: '2021-12-23T15:09:28.941Z',
  sourceDateStart: '2021-12-23T15:09:28.941Z',
  sourceDateEnd: '2021-12-23T15:09:28.941Z',
  minHorizontalAccuracyCE90: 0,
  sensors: ['VIS', 'OTHER'],
  region: ['region1', 'region1'],
  productId: 'string',
  productVersion: '1.0',
  productType: 'OrthophotoHistory',
  srsName: 'string',
  maxResolutionDeg: 0.000171661376953125,
  maxResolutionMeter: 8000,
  rms: 0,
  scale: 1,
  footprint: {
    type: 'Polygon',
    coordinates: [
      [
        [0, -89.999],
        [0, 90],
        [180, 90],
        [180, -89.999],
        [0, -89.999],
      ],
    ],
  },
  includedInBests: [],
  rawProductData: {
    bbox: [0, 0, 67.5, 22.5],
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [67.5, 0],
              [67.5, 22.5],
              [0, 22.5],
              [0, 0],
            ],
          ],
        },
      },
    ],
  },
  productBoundingBox: '-180,-89.999,0,90',
  tileMimeFormat: 'image/jpeg',
} as unknown as LayerMetadata;

const layerMetadataSample: LayerMetadata = {
  type: 'RECORD_RASTER',
  classification: 'string',
  productName: 'string',
  description: 'string',
  srsId: 'string',
  producerName: 'string',
  creationDate: '2021-12-23T15:09:28.941Z',
  ingestionDate: '2021-12-23T15:09:28.941Z',
  updateDate: '2021-12-23T15:09:28.941Z',
  sourceDateStart: '2021-12-23T15:09:28.941Z',
  sourceDateEnd: '2021-12-23T15:09:28.941Z',
  minHorizontalAccuracyCE90: 0,
  sensors: ['VIS', 'OTHER'],
  region: ['region1', 'region1'],
  productId: 'string',
  productVersion: '1.0',
  productType: 'OrthophotoHistory',
  srsName: 'string',
  maxResolutionDeg: 0.0054931640625,
  maxResolutionMeter: 8000,
  rms: 0,
  scale: 1,
  footprint: {
    type: 'Polygon',
    coordinates: [
      [
        [0, -89.999],
        [0, 90],
        [180, 90],
        [180, -89.999],
        [0, -89.999],
      ],
    ],
  },
  includedInBests: [],
  rawProductData: {
    bbox: [0, 0, 67.5, 22.5],
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [67.5, 0],
              [67.5, 22.5],
              [0, 22.5],
              [0, 0],
            ],
          ],
        },
      },
    ],
  },
  productBoundingBox: '-180,-89.999,0,90',
  tileMimeFormat: 'image/jpeg',
} as unknown as LayerMetadata;

const layerMetadataRoi = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.0054931640625 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, -89.999],
            [0, 90],
            [180, 90],
            [180, -89.999],
            [0, -89.999],
          ],
        ],
      },
    },
  ],
};
const layerFromCatalog = {
  id: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  links: [
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMS',
      url: 'http://mapproxy-map-proxy-map-proxy/service?REQUEST=GetCapabilities',
    },
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMTS',
      url: 'http://mapproxy-map-proxy-map-proxy/wmts/1.0.0/WMTSCapabilities.xml',
    },
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMTS_LAYER',
      url: 'http://mapproxy-map-proxy-map-proxy/wmts/string-OrthophotoHistory/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
    },
  ],
  metadata: layerMetadata,
};

const layerFromCatalogSample = {
  id: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  links: [
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMS',
      url: 'http://mapproxy-map-proxy-map-proxy/service?REQUEST=GetCapabilities',
    },
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMTS',
      url: 'http://mapproxy-map-proxy-map-proxy/wmts/1.0.0/WMTSCapabilities.xml',
    },
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMTS_LAYER',
      url: 'http://mapproxy-map-proxy-map-proxy/wmts/string-OrthophotoHistory/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
    },
  ],
  metadata: layerMetadataSample,
};

/**
 * @deprecated GetMap API - will be deprecated on future
 */
const completedJob: IJobResponse<IJobParameters, ITaskParameters> = {
  id: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
  resourceId: 'string',
  version: '1.0',
  type: 'rasterTilesExporter',
  domain: 'testDomain',
  description: '',
  parameters: {
    crs: 'EPSG:4326',
    sanitizedBbox: [0, 0, 25, 41],
    exportVersion: ExportVersion.GETMAP,
    fileName: 'test.gpkg',
    relativeDirectoryPath: 'test',
    zoomLevel: 4,
    callbacks: [
      {
        url: 'http://localhost:1234',
        bbox: [0, 0, 25, 41],
      },
    ],
    callbackParams: {
      dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
      fileUri: 'http://localhost:4515/downloads/gm_0c3e455f_4aeb_4258_982d_f7773469a92d_4_0_000000_0000025_0000041_00000.gpkg',
      success: true,
      fileSize: 1773568,
      requestId: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
      packageName: 'gm_0c3e455f_4aeb_4258_982d_f7773469a92d_4_0_000000_0000025_0000041_00000',
      expirationTime: new Date(),
      targetResolution: 0.0439453125,
    },
    cleanupData: {
      directoryPath: 'test',
      cleanupExpirationTimeUTC: new Date(),
    },

    targetResolution: 0.0439453125,
  },

  status: OperationStatus.COMPLETED,
  percentage: 100,
  reason: '',
  isCleaned: false,
  priority: 1000,
  expirationDate: new Date(),
  internalId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  productName: 'string',
  productType: 'OrthophotoHistory',
  taskCount: 1,
  completedTasks: 1,
  failedTasks: 0,
  expiredTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  abortedTasks: 0,
  tasks: [
    {
      id: '542ebbfd-f4d1-4c77-bd4d-97ca121f0de7',
      jobId: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
      type: 'rasterTilesExporter',
      description: '',
      parameters: {
        isNewTarget: true,
        targetFormat: TileOutputFormat.PNG,
        batches: [],
        sources: [],
      },
      status: OperationStatus.COMPLETED,
      reason: '',
      attempts: 0,
      resettable: true,
      created: '2021-12-29T08:06:48.399Z',
      updated: '2021-12-29T08:07:00.293Z',
    },
  ],
  created: '2021-12-29T08:06:48.399Z',
  updated: '2021-12-29T08:07:00.270Z',
};

/**
 * @deprecated GetMap API - will be deprecated on future
 */
const inProgressJob: IJobResponse<IJobParameters, ITaskParameters> = {
  id: 'fa3ab609-377a-4d96-bf0b-e0bb72f683b8',
  domain: 'testDomain',
  resourceId: 'string',
  version: '1.0',
  type: 'rasterTilesExporter',
  percentage: 0,
  description: '',
  parameters: {
    fileName: 'test.gpkg',
    relativeDirectoryPath: 'test',
    exportVersion: ExportVersion.GETMAP,
    crs: 'EPSG:4326',
    sanitizedBbox: [0, 0, 25, 41],
    zoomLevel: 4,
    callbacks: [{ url: 'http://localhost:6969', bbox: [0, 0, 25, 41] }],
    targetResolution: 0.0439453125,
  },
  status: OperationStatus.IN_PROGRESS,
  reason: '',
  isCleaned: false,
  priority: 0,
  expirationDate: new Date(),
  internalId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  productName: 'string',
  productType: 'OrthophotoHistory',
  taskCount: 1,
  completedTasks: 0,
  failedTasks: 0,
  expiredTasks: 0,
  pendingTasks: 0,
  abortedTasks: 0,
  inProgressTasks: 1,
  tasks: [
    {
      id: '1f765695-338b-4752-b182-a8cbae3c610e',
      jobId: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
      type: 'rasterTilesExporter',
      description: '',
      parameters: {
        isNewTarget: true,
        targetFormat: TileOutputFormat.PNG,
        batches: [],
        sources: [],
      },
      status: OperationStatus.IN_PROGRESS,
      reason: '',
      attempts: 0,
      resettable: true,
      created: '2021-12-29T10:42:13.487Z',
      updated: '2021-12-29T10:42:16.231Z',
    },
  ],
  created: '2021-12-29T10:42:13.487Z',
  updated: '2021-12-29T10:42:13.487Z',
};

/**
 * @deprecated GetMap API - will be deprecated on future
 */
const workerInput: IWorkerInput = {
  fileName: 'test.gpkg',
  relativeDirectoryPath: 'test',
  exportVersion: ExportVersion.GETMAP,
  sanitizedBbox: [0, 2.999267578125, 25.0048828125, 41.0009765625],
  targetResolution: 0.0000429153442382812,
  zoomLevel: 15,
  dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  callbacks: [
    {
      bbox: [0, 3, 25, 41],
      url: 'http://localhost:6969',
    },
  ],
  sources: [
    {
      path: 'test.gpkg',
      type: 'GPKG',
      extent: {
        minX: 0,
        minY: 2.999267578125,
        maxX: 25.0048828125,
        maxY: 41.0009765625,
      },
    },
  ],
  batches: [
    {
      zoom: 15,
      minX: 32768,
      minY: 16930,
      maxX: 20936,
      maxY: 23848,
    },
    {
      zoom: 14,
      minX: 16384,
      minY: 8465,
      maxX: 10468,
      maxY: 11924,
    },
  ],
  version: '1.0',
  cswProductId: 'string',
  priority: 0,
  crs: 'EPSG:4326',
  productType: 'OrthophotoHistory',
};

/**
 * @deprecated GetMap API - will be deprecated on future
 */
const jobs = [inProgressJob, completedJob];

const userInput: ICreatePackage = {
  dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  targetResolution: 0.00439453125,
  callbackURLs: ['http://callback-url.com'],
  bbox: [-5, 3, 25, 41],
  crs: 'EPSG:4326',
};

const fc1: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625 },
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
      properties: { maxResolutionDeg: 0.02197265625 },
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

const fcMinResolutionDeg: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625, minResolutionDeg: 0.17578125 },
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
      properties: { maxResolutionDeg: 0.02197265625, minResolutionDeg: 0.087890625 },
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

const fcBadMinResolutionDeg: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.703125, minResolutionDeg: 0.02197265625 },
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

const fcNoMaxResolutionDeg: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
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

const fcNoIntersection: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625 },
      geometry: {
        coordinates: [
          [
            [-47.86631849806537, -5.0650089181259546],
            [-59.270868429887855, -5.0650089181259546],
            [-59.270868429887855, -19.06378650396573],
            [-47.86631849806537, -19.06378650396573],
            [-47.86631849806537, -5.0650089181259546],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

const fcTooHighResolution: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.000000335276126861572 },
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

const workerExportInput: IWorkerExportInput = {
  roi: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          maxResolutionDeg: 0.02197265625,
        },
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
        properties: {
          maxResolutionDeg: 0.02197265625,
        },
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
  },
  fileNamesTemplates: {
    dataURI: 'OrthophotoHistory_string_1_0_5_2023_03_02T05_43_27_066Z.gpkg',
    metadataURI: 'OrthophotoHistory_string_1_0_5_2023_03_02T05_43_27_066Z.json',
  },
  relativeDirectoryPath: '1a26c1661df10eee54f9727fcdb8b71d',
  dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  exportVersion: ExportVersion.ROI,
  version: '1.0',
  cswProductId: 'string',
  crs: 'EPSG:4326',
  productType: 'OrthophotoHistory',
  batches: [],
  sources: [
    {
      path: '1a26c1661df10eee54f9727fcdb8b71d/OrthophotoHistory_string_1_0_5_2023_03_02T05_43_27_066Z.gpkg',
      type: 'GPKG',
      extent: {
        minX: 25.120393802953117,
        minY: -16.979479051947962,
        maxX: 37.42414218385065,
        maxY: 17.95036866237062,
      },
    },
    {
      path: 'undefined/undefined',
      type: 'S3',
    },
  ],
  priority: 0,
  callbacks: [
    {
      url: 'http://example.getmap.com/callback',
      roi: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              maxResolutionDeg: 0.02197265625,
            },
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
            properties: {
              maxResolutionDeg: 0.02197265625,
            },
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
      },
    },
  ],
  gpkgEstimatedSize: 0,
};

const completedExportJob: IJobResponse<IJobExportParameters, ITaskParameters> = {
  id: 'afbdd5e6-25db-4567-a81f-71e0e7d30761',
  resourceId: 'string_completed',
  version: '1.0',
  type: 'rasterTilesExporter',
  domain: 'testDomain',
  description: '',
  parameters: {
    crs: 'EPSG:4326',
    roi: fc1,
    callbacks: [
      {
        url: 'http://localhost:1234',
        roi: fc1,
      },
    ],
    exportVersion: ExportVersion.ROI,
    callbackParams: {
      roi: fc1,
      links: {
        dataURI: 'http://files-server/downloads/Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.gpkg',
        metadataURI: 'http://files-server/downloads/Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.json',
      },
      status: OperationStatus.COMPLETED,
      fileSize: 1773568,
      jobId: 'afbdd5e6-25db-4567-a81f-71e0e7d30761',
      expirationTime: new Date(),
      recordCatalogId: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
    },
    cleanupData: {
      directoryPath: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
      cleanupExpirationTimeUTC: new Date(),
    },
    gpkgEstimatedSize: 187500,
    fileNamesTemplates: {
      dataURI: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.gpkg',
      metadataURI: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.json',
    },
    relativeDirectoryPath: '415c9316e58862194145c4b54cf9d87e',
  },

  status: OperationStatus.COMPLETED,
  percentage: 100,
  reason: '',
  isCleaned: false,
  priority: 1000,
  expirationDate: new Date(),
  internalId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  productName: 'string',
  productType: 'Orthophoto',
  taskCount: 1,
  completedTasks: 1,
  failedTasks: 0,
  expiredTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  abortedTasks: 0,
  tasks: [
    {
      id: '542ebbfd-f4d1-4c77-bd4d-97ca121f0de7',
      jobId: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
      type: 'rasterTilesExporter',
      description: '',
      parameters: {
        isNewTarget: true,
        targetFormat: TileOutputFormat.JPEG,
        batches: [],
        sources: [],
      },
      status: OperationStatus.COMPLETED,
      reason: '',
      attempts: 0,
      resettable: true,
      created: '2021-12-29T08:06:48.399Z',
      updated: '2021-12-29T08:07:00.293Z',
    },
  ],
  created: '2021-12-29T08:06:48.399Z',
  updated: '2021-12-29T08:07:00.270Z',
};

const inProgressExportJob: IJobResponse<IJobExportParameters, ITaskParameters> = {
  id: 'fa3ab609-377a-4d96-bf0b-e0bb72f683b8',
  domain: 'testDomain',
  resourceId: 'string_inprogress',
  version: '1.0',
  type: 'rasterTilesExporter',
  percentage: 0,
  description: '',
  parameters: {
    crs: 'EPSG:4326',
    roi: fc1,
    callbacks: [{ url: 'http://localhost:6969', roi: fc1 }],
    exportVersion: ExportVersion.ROI,
    gpkgEstimatedSize: 187500,
    fileNamesTemplates: {
      dataURI: 'Orthophoto_testArea_1_0_2023_03_01T15_09_50_924Z.gpkg',
      metadataURI: 'Orthophoto_testArea_1_0_2023_03_01T15_09_50_924Z.json',
    },
    relativeDirectoryPath: '415c9316e58862194145c4b54cf9d87e',
  },
  status: OperationStatus.IN_PROGRESS,
  reason: '',
  isCleaned: false,
  priority: 0,
  expirationDate: new Date(),
  internalId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  productName: 'string',
  productType: 'OrthophotoHistory',
  taskCount: 1,
  completedTasks: 0,
  failedTasks: 0,
  expiredTasks: 0,
  pendingTasks: 0,
  abortedTasks: 0,
  inProgressTasks: 1,
  tasks: [
    {
      id: '1f765695-338b-4752-b182-a8cbae3c610e',
      jobId: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
      type: 'rasterTilesExporter',
      description: '',
      parameters: {
        isNewTarget: true,
        targetFormat: TileOutputFormat.JPEG,
        batches: [],
        sources: [],
      },
      status: OperationStatus.IN_PROGRESS,
      reason: '',
      attempts: 0,
      resettable: true,
      created: '2021-12-29T10:42:13.487Z',
      updated: '2021-12-29T10:42:16.231Z',
    },
  ],
  created: '2021-12-29T10:42:13.487Z',
  updated: '2021-12-29T10:42:13.487Z',
};

const exportJobs = [inProgressExportJob, completedExportJob];

const metadataExportJson = {
  type: RecordType.RECORD_RASTER,
  classification: 'string',
  productName: 'string',
  description: 'string',
  srsId: 'string',
  producerName: 'string',
  creationDate: '2021-12-23T15:09:28.941Z',
  ingestionDate: '2021-12-23T15:09:28.941Z',
  updateDate: '2021-12-23T15:09:28.941Z',
  sourceDateStart: '2021-12-23T15:09:28.941Z',
  sourceDateEnd: '2021-12-23T15:09:28.941Z',
  minHorizontalAccuracyCE90: 0,
  sensors: ['VIS', 'OTHER'],
  region: ['region1', 'region1'],
  productId: 'string',
  productVersion: '1.0',
  productType: ProductType.ORTHOPHOTO_HISTORY,
  srsName: 'string',
  maxResolutionDeg: 0.02197265625,
  maxResolutionMeter: 8000,
  rms: 0,
  scale: 1,
  footprint: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [30.42608533411871, 11.52904501530621],
          [37.42414218385065, 11.52904501530621],
          [37.42414218385065, 17.95036866237062],
          [30.42608533411871, 17.95036866237062],
          [30.42608533411871, 11.52904501530621],
        ],
      ],
      [
        [
          [25.120393802953117, -16.979479051947962],
          [29.726720838716574, -16.979479051947962],
          [29.726720838716574, -10.646156974961286],
          [25.120393802953117, -10.646156974961286],
          [25.120393802953117, -16.979479051947962],
        ],
      ],
    ],
  },
  includedInBests: [],
  rawProductData: {
    bbox: [0, 0, 67.5, 22.5],
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [67.5, 0],
              [67.5, 22.5],
              [0, 22.5],
              [0, 0],
            ],
          ],
        },
      },
    ],
  },
  productBoundingBox: '25.120393802953117,-16.979479051947962,37.42414218385065,17.95036866237062',
  tileMimeFormat: 'image/jpeg',
  sha256: 'sha256_hash_mock',
} as unknown as LayerMetadata;

const featuresRecordsSampleFc1 = [
  {
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
    targetResolutionDeg: 0.02197265625,
    targetResolutionMeter: 2445.98,
    minResolutionDeg: 0.703125,
    minZoomLevel: 0,
    zoomLevel: 5,
    sanitizedBox: [28.125, 11.25, 39.375, 22.5],
  },
  {
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
    sanitizedBox: [22.5, -22.5, 33.75, -5.625],
    targetResolutionDeg: 0.02197265625,
    targetResolutionMeter: 2445.98,
    minResolutionDeg: 0.703125,
    minZoomLevel: 0,
    zoomLevel: 5,
  },
];

const featuresRecordsSampleFcMinResolutionDeg = [
  {
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
    targetResolutionDeg: 0.02197265625,
    targetResolutionMeter: 2445.98,
    minResolutionDeg: 0.17578125,
    minZoomLevel: 2,
    zoomLevel: 5,
    sanitizedBox: [28.125, 11.25, 39.375, 22.5],
  },
  {
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
    sanitizedBox: [22.5, -22.5, 33.75, -5.625],
    targetResolutionDeg: 0.02197265625,
    targetResolutionMeter: 2445.98,
    minResolutionDeg: 0.087890625,
    minZoomLevel: 3,
    zoomLevel: 5,
  },
];

const pycswRecord = {
  id: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  links: [
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMS',
      url: 'http://mapproxy-map-proxy-map-proxy/service?REQUEST=GetCapabilities',
    },
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMTS',
      url: 'http://mapproxy-map-proxy-map-proxy/wmts/1.0.0/WMTSCapabilities.xml',
    },
    {
      name: 'string-OrthophotoHistory',
      protocol: 'WMTS_LAYER',
      url: 'http://mapproxy-map-proxy-map-proxy/wmts/string-OrthophotoHistory/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
    },
  ],
  metadata: {
    type: 'RECORD_RASTER',
    classification: 'string',
    productName: 'string',
    description: 'string',
    srsId: 'string',
    producerName: 'string',
    creationDate: '2021-12-23T15:09:28.941Z',
    ingestionDate: '2021-12-23T15:09:28.941Z',
    updateDate: '2021-12-23T15:09:28.941Z',
    sourceDateStart: '2021-12-23T15:09:28.941Z',
    sourceDateEnd: '2021-12-23T15:09:28.941Z',
    minHorizontalAccuracyCE90: 0,
    sensors: ['VIS', 'OTHER'],
    region: ['region1', 'region1'],
    productId: 'string',
    productVersion: '1.0',
    productType: 'OrthophotoHistory',
    srsName: 'string',
    maxResolutionDeg: 0.0054931640625,
    maxResolutionMeter: 8000,
    rms: 0,
    scale: 1,
    footprint: {
      type: 'Polygon',
      coordinates: [
        [
          [0, -89.999],
          [0, 90],
          [180, 90],
          [180, -89.999],
          [0, -89.999],
        ],
      ],
    },
    includedInBests: [],
    rawProductData: {
      bbox: [0, 0, 67.5, 22.5],
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [67.5, 0],
                [67.5, 22.5],
                [0, 22.5],
                [0, 0],
              ],
            ],
          },
        },
      ],
    },
    productBoundingBox: '-180,-89.999,0,90',
    tileMimeFormat: 'image/jpeg',
  } as unknown as LayerMetadata,
};

export {
  layerFromCatalog,
  workerInput,
  workerExportInput,
  jobs,
  userInput,
  completedJob,
  inProgressJob,
  fc1,
  fcNoMaxResolutionDeg,
  fcBadMinResolutionDeg,
  fcMinResolutionDeg,
  featuresRecordsSampleFcMinResolutionDeg,
  fcNoIntersection,
  fcTooHighResolution,
  completedExportJob,
  inProgressExportJob,
  exportJobs,
  metadataExportJson,
  layerFromCatalogSample,
  featuresRecordsSampleFc1,
  layerMetadataRoi,
  layerMetadataSample,
  pycswRecord,
};
