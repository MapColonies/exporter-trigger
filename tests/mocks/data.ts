/* eslint-disable */
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { IWorkerInput } from '../../src/common/interfaces';

const layerMetadata = {
  type: 'RECORD_RASTER',
  classification: '4',
  productName: 'testProduct',
  description: 'test desc',
  srsId: '4326',
  producerName: 'producer',
  creationDate: '2021-10-26T10:59:39.842Z',
  ingestionDate: '2021-10-26T10:59:39.842Z',
  updateDate: '2019-04-06T00:00:00.000Z',
  sourceDateStart: '2019-04-06T00:00:00.000Z',
  sourceDateEnd: '2019-04-06T00:00:00.000Z',
  accuracyCE90: '3',
  sensorType: ['UNDEFINED'],
  region: '',
  productId: 'testId',
  productVersion: '1.0',
  productType: 'Orthophoto',
  srsName: 'WGS84GEO',
  resolution: '0.000018519',
  maxResolutionMeter: '0.2',
  rms: null,
  scale: null,
  footprint:
    '{"type":"Polygon","coordinates":[[[34.8468438649828,32.0689996810298],[34.8637856279928,32.0590059440186],[34.8773961450173,32.0680478960404],[34.8804418550117,32.0528193460686],[34.8786334639958,32.0466327470143],[34.8605495609931,32.0488218510146],[34.8468438649828,32.0689996810298]]]}',
  layerPolygonParts:
    '{"bbox":[34.8468438649828,32.0466327470143,34.8804418550117,32.0689996810298],"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[34.8468438649828,32.0689996810298],[34.8637856279928,32.0590059440186],[34.8773961450173,32.0680478960404],[34.8804418550117,32.0528193460686],[34.8786334639958,32.0466327470143],[34.8605495609931,32.0488218510146],[34.8468438649828,32.0689996810298]]]},"properties":{"Dsc":"teat","Rms":null,"Ep90":"3","Scale":null,"Source":"testId-1.0","Resolution":"0.2","SensorType":"OTHER","SourceName":"test","UpdateDate":"06/04/2019"}}]}',
  includedInBests: [],
  rawProductData: {
    bbox: [34.8468438649768, 32.0466327470035, 34.8804418550096, 32.0689996810415],
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [34.8468438649768, 32.0689996810415],
              [34.8637856279967, 32.0590059440131],
              [34.8773961450108, 32.0680478960332],
              [34.8804418550096, 32.0528193460393],
              [34.8786334639992, 32.0466327470035],
              [34.8605495610029, 32.0488218510031],
              [34.8468438649768, 32.0689996810415],
            ],
          ],
        },
        properties: {
          Name: 'test layer',
          Type: 'Orthophoto',
          Resolution: '0.5',
        },
      },
    ],
  },
  productBoundingBox: '34.8468438649828,32.0466327470143,34.8804418550117,32.0689996810298',
} as unknown as LayerMetadata;

const layerFromCatalog = {
  id: '6007f15c-8978-4c83-adcb-655fb2185856',
  links: [
    {
      name: 'testId-Orthophoto',
      protocol: 'WMS',
      url: 'http://mapproxy-qa-map-proxy-map-proxy-route-raster.apps.v0h0bdx6.eastus.aroapp.io/service?REQUEST=GetCapabilities',
    },
    {
      name: 'testId-Orthophoto',
      protocol: 'WMTS',
      url: 'http://mapproxy-qa-map-proxy-map-proxy-route-raster.apps.v0h0bdx6.eastus.aroapp.io/wmts/1.0.0/WMTSCapabilities.xml',
    },
    {
      name: 'testId-Orthophoto',
      protocol: 'WMTS_LAYER',
      url: 'http://mapproxy-qa-map-proxy-map-proxy-route-raster.apps.v0h0bdx6.eastus.aroapp.io/wmts/testId-Orthophoto/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
    },
  ],
  metadata: layerMetadata,
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
  cswProductId: 'testId',
  targetResolution: 0.0000429153442382812,
  dbId: '07a8d8dc-4624-434d-b799-8f2f57643b2f',
  packageName: 'myPackage',
  callbackURL: 'http://example.getmap.com/callback',
  tilesPath: 'testId/1.0',
  priority: 0,
  crs: 'EPSG:4326',
};

export { layerFromCatalog, workerInput, layerMetadata };
