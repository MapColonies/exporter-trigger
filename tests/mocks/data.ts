/* eslint-disable */
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { ICreatePackage, IJobParameters, ITaskParameters, IWorkerInput } from '../../src/common/interfaces';

const layerMetadata = {
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
  maxResolutionDeg: 0.072,
  maxResolutionMeter: 8000,
  rms: 0,
  scale: 1,
  footprint: {
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
  layerPolygonParts: {
    bbox: [0, 0, 0, 0],
    type: 'FeatureCollection',
    features: [
      {
        bbox: [0, 0, 0, 0],
        type: 'Feature',
        geometry: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Point',
            },
          ],
        },
        properties: {},
      },
    ],
  },
  includedInBests: [],
  rawProductData: {
    bbox: [0, 0, 0, 0],
    type: 'FeatureCollection',
    features: [
      {
        bbox: [0, 0, 0, 0],
        type: 'Feature',
        geometry: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Point',
            },
          ],
        },
        properties: {},
      },
    ],
  },
  productBoundingBox: '-180,-90,180,90',
} as unknown as LayerMetadata;

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

const completedJob: IJobResponse<IJobParameters, ITaskParameters> = {
  id: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
  resourceId: 'string',
  version: '1.0',
  type: 'rasterTilesExporter',
  description: '',
  parameters: {
    crs: 'EPSG:4326',
    bbox: [0, 0, 25, 41],
    dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
    version: '1.0',
    footprint: {
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
    tilesPath: 'string/OrthophotoHistory',
    zoomLevel: 4,
    callbackURLs: ['http://localhost:1234'],
    productType: 'OrthophotoHistory',
    cswProductId: 'string',
    callbackParams: {
      bbox: [0, 0, 25, 41],
      dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
      fileUri: 'http://localhost:4515/downloads/gm_0c3e455f_4aeb_4258_982d_f7773469a92d_4_0_000000_0000025_0000041_00000.gpkg',
      success: true,
      fileSize: 1773568,
      requestId: 'b0b19b88-aecb-4e74-b694-dfa7eada8bf7',
      packageName: 'gm_0c3e455f_4aeb_4258_982d_f7773469a92d_4_0_000000_0000025_0000041_00000',
      expirationTime: new Date(),
      targetResolution: 0.0439453125,
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
  tasks: [
    {
      id: '542ebbfd-f4d1-4c77-bd4d-97ca121f0de7',
      type: 'rasterTilesExporter',
      description: '',
      parameters: {
        crs: 'EPSG:4326',
        bbox: [0, 0, 25, 41],
        dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
        footprint: {
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
        tilesPath: 'string/OrthophotoHistory',
        zoomLevel: 4,
        callbackURLs: ['http://localhost:1234'],
        productType: 'OrthophotoHistory',
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

const inProgressJob: IJobResponse<IJobParameters, ITaskParameters> = {
  id: 'fa3ab609-377a-4d96-bf0b-e0bb72f683b8',
  resourceId: 'string',
  version: '1.0',
  type: 'rasterTilesExporter',
  description: '',
  parameters: {
    crs: 'EPSG:4326',
    bbox: [0, 0, 25, 41],
    dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
    version: '1.0',
    footprint: {
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
    tilesPath: 'string/OrthophotoHistory',
    zoomLevel: 4,
    callbackURLs: ['http://localhost:6969'],
    productType: 'OrthophotoHistory',
    cswProductId: 'string',
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
  inProgressTasks: 1,
  tasks: [
    {
      id: '1f765695-338b-4752-b182-a8cbae3c610e',
      type: 'rasterTilesExporter',
      description: '',
      parameters: {
        crs: 'EPSG:4326',
        bbox: [0, 0, 25, 41],
        dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
        footprint: {
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
        tilesPath: 'string/OrthophotoHistory',
        zoomLevel: 4,
        callbackURLs: ['http://localhost:6969'],
        productType: 'OrthophotoHistory',
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

const workerInput: IWorkerInput = {
  bbox: [0, 3, 25, 41],
  targetResolution: 0.0000429153442382812,
  zoomLevel: 15,
  dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  callbackURLs: ['http://localhost:6969'],
  version: '1.0',
  cswProductId: 'string',
  footprint: {
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
  tilesPath: 'string/OrthophotoHistory',
  priority: 0,
  crs: 'EPSG:4326',
  productType: 'OrthophotoHistory',
};

const jobs = [inProgressJob, completedJob];

const userInput: ICreatePackage = {
  dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  targetResolution: 0.0439453125,
  callbackURLs: ['http://callback-url.com'],
  bbox: [0, 0, 25, 41],
  crs: 'EPSG:4326',
};

export { layerFromCatalog, workerInput, jobs, userInput, completedJob, inProgressJob };
