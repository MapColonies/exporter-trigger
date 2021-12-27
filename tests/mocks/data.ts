/* eslint-disable */
import { IWorkerInput } from '../../src/common/interfaces';

const layerFromCatalog = {
  id: '6007f15c-8978-4c83-adcb-655fb2185856',
  links: [
    {
      name: '2021_10_26T10_59_14Z_MAS_6_ORT_247993-Orthophoto',
      protocol: 'WMS',
      url: 'http://mapproxy-qa-map-proxy-map-proxy-route-raster.apps.v0h0bdx6.eastus.aroapp.io/service?REQUEST=GetCapabilities',
    },
    {
      name: '2021_10_26T10_59_14Z_MAS_6_ORT_247993-Orthophoto',
      protocol: 'WMTS',
      url: 'http://mapproxy-qa-map-proxy-map-proxy-route-raster.apps.v0h0bdx6.eastus.aroapp.io/wmts/1.0.0/WMTSCapabilities.xml',
    },
    {
      name: '2021_10_26T10_59_14Z_MAS_6_ORT_247993-Orthophoto',
      protocol: 'WMTS_LAYER',
      url: 'http://mapproxy-qa-map-proxy-map-proxy-route-raster.apps.v0h0bdx6.eastus.aroapp.io/wmts/2021_10_26T10_59_14Z_MAS_6_ORT_247993-Orthophoto/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
    },
  ],
  metadata: {
    type: 'RECORD_RASTER',
    classification: '4',
    productName: 'O_arzi_mz_20cm',
    description: 'תשתית אורתופוטו בישראל עדכני לאפריל 2019',
    srsId: '4326',
    producerName: 'IDFMU',
    creationDate: '2021-10-26T10:59:39.842Z',
    ingestionDate: '2021-10-26T10:59:39.842Z',
    updateDate: '2019-04-06T00:00:00.000Z',
    sourceDateStart: '2019-04-06T00:00:00.000Z',
    sourceDateEnd: '2019-04-06T00:00:00.000Z',
    accuracyCE90: '3',
    sensorType: ['UNDEFINED'],
    region: '',
    productId: '2021_10_26T10_59_14Z_MAS_6_ORT_247993',
    productVersion: '1.0',
    productType: 'Orthophoto',
    srsName: 'WGS84GEO',
    resolution: '0.0000018519',
    maxResolutionMeter: '0.2',
    rms: null,
    scale: null,
    footprint:
      '{"type":"Polygon","coordinates":[[[34.8468438649828,32.0689996810298],[34.8637856279928,32.0590059440186],[34.8773961450173,32.0680478960404],[34.8804418550117,32.0528193460686],[34.8786334639958,32.0466327470143],[34.8605495609931,32.0488218510146],[34.8468438649828,32.0689996810298]]]}',
    layerPolygonParts:
      '{"bbox":[34.8468438649828,32.0466327470143,34.8804418550117,32.0689996810298],"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[34.8468438649828,32.0689996810298],[34.8637856279928,32.0590059440186],[34.8773961450173,32.0680478960404],[34.8804418550117,32.0528193460686],[34.8786334639958,32.0466327470143],[34.8605495609931,32.0488218510146],[34.8468438649828,32.0689996810298]]]},"properties":{"Dsc":"תשתית אורתופוטו בישראל עדכני לאפריל 2019","Rms":null,"Ep90":"3","Scale":null,"Source":"2021_10_26T10_59_14Z_MAS_6_ORT_247993-1.0","Resolution":"0.2","SensorType":"OTHER","SourceName":"O_arzi_mz_w84geo_Tiff_20cm","UpdateDate":"06/04/2019"}}]}',
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
            Name: 'O_arzi_mz_w84geo_Apr19_tiff_0.2',
            Type: 'Orthophoto',
            Resolution: '0.2',
          },
        },
      ],
    },
    productBoundingBox: '34.8468438649828,32.0466327470143,34.8804418550117,32.0689996810298',
  },
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
  targetResolution: 0.0000429153442382812,
  dbId: '07a8d8dc-4624-434d-b799-8f2f57643b2f',
  callbackURL: 'http://example.getmap.com/callback',
  tilesPath: '2021_10_26T10_59_14Z_MAS_6_ORT_247993/1.0',
  priority: 0,
  crs: 'EPSG:4326',
};

export { layerFromCatalog, workerInput };
