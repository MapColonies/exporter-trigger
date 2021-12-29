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
  accuracyCE90: 0,
  sensorType: ['VIS'],
  region: 'string',
  productId: 'string',
  productVersion: '1.0',
  productType: 'OrthophotoHistory',
  srsName: 'string',
  resolution: 0.072,
  maxResolutionMeter: 8000,
  rms: 0,
  scale: '1',
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
      name: 'string-1.0-OrthophotoHistory',
      protocol: 'WMS',
      url: 'http://mapproxy-map-proxy-map-proxy/service?REQUEST=GetCapabilities',
    },
    {
      name: 'string-1.0-OrthophotoHistory',
      protocol: 'WMTS',
      url: 'http://mapproxy-map-proxy-map-proxy/wmts/1.0.0/WMTSCapabilities.xml',
    },
    {
      name: 'string-1.0-OrthophotoHistory',
      protocol: 'WMTS_LAYER',
      url: 'http://mapproxy-map-proxy-map-proxy/wmts/string-1.0-OrthophotoHistory/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
    },
  ],
  metadata: layerMetadata,
};

const jobsMock: IJobResponse<IJobParameters, ITaskParameters> = {
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
    tilesPath: 'string/1.0/OrthophotoHistory',
    callbackURL: ['http://localhost:1234'],
    packageName: 'gm_0c3e455f_4aeb_4258_982d_f7773469a92d_4_0_000000_0000025_0000041_00000',
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
        tilesPath: 'string/1.0/OrthophotoHistory',
        zoomLevel: 4,
        callbackURL: ['http://localhost:1234'],
        packageName: 'gm_0c3e455f_4aeb_4258_982d_f7773469a92d_4_0_000000_0000025_0000041_00000',
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

const workerInput: IWorkerInput = {
  footprint: {
    type: 'Polygon',
    coordinates: [
      [
        [34.8468438649828, 32.0689996810298],
        [34.8637856279928, 32.0590059440186],
        [34.8773961450173, 32.0680478960404],
        [34.8804418550117, 32.0528193460686],
        [34.8786334639958, 32.0466327470143],
        [34.8605495609931, 32.0488218510146],
        [34.8468438649828, 32.0689996810298],
      ],
    ],
  },
  bbox: [34.811938017107494, 31.95475033759175, 34.82237261707599, 31.96426962177354],
  version: '1.0',
  cswProductId: '2021_10_26T10_59_14Z_MAS_6_ORT_247993',
  targetResolution: 0.0000014576721191406,
  dbId: '07a8d8dc-4624-434d-b799-8f2f57643b2f',
  callbackURL: ['http://example.getmap.com/callback'],
  tilesPath: '2021_10_26T10_59_14Z_MAS_6_ORT_247993/1.0/Orthophoto',
  packageName: 'gm_test_1',
  priority: 0,
  crs: 'EPSG:4326',
  productType: 'Orthohphoto',
};

const jobs = [
  { ...jobsMock, status: OperationStatus.IN_PROGRESS, tasks: [{ ...jobsMock.tasks[0], status: OperationStatus.IN_PROGRESS }] },
  { ...jobsMock, status: OperationStatus.PENDING, tasks: [{ ...jobsMock.tasks[0], status: OperationStatus.PENDING }] },
  // jobsMock,
];

const userInput: ICreatePackage = {
  dbId: '0c3e455f-4aeb-4258-982d-f7773469a92d',
  targetResolution: 0.0439453125,
  callbackURL: ['http://callback-url.com'],
  bbox: [0, 0, 25, 41],
  crs: 'EPSG:4326',
};

export { layerFromCatalog, workerInput, jobs, userInput };
