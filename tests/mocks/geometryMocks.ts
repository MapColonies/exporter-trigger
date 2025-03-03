/* eslint-disable @typescript-eslint/no-magic-numbers */
import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import { BBox, Polygon } from 'geojson';

export const multiplePolygonsFeatureCollection: RoiFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.000000335276126861572, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [34.68563526968475, 31.799024824243986],
            [34.69719747249593, 31.793544108926312],
            [34.69416177376209, 31.8017562833746],
            [34.68563526968475, 31.799024824243986],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.000000335276126861572, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [34.698715652746046, 31.782910541685524],
            [34.71008144041147, 31.778074379098868],
            [34.71254076798829, 31.778395803434194],
            [34.705718066863994, 31.786611000347435],
            [34.698715652746046, 31.782910541685524],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const jobRoiFeature: RoiFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.000000335276126861572, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [34.654844853612445, 31.78250604942373],
            [34.66335223583931, 31.77848185379999],
            [34.66751444972459, 31.785655297761267],
            [34.65845820412852, 31.788590611663594],
            [34.654844853612445, 31.78250604942373],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const containedExportRoi: RoiFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.000000335276126861572, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [34.65556107524807, 31.782535779873996],
            [34.66054460329286, 31.779936697774545],
            [34.66325013717881, 31.778700631935124],
            [34.66747073042873, 31.78566661855602],
            [34.65879212058894, 31.788384925441136],
            [34.65556107524807, 31.782535779873996],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const notContainedExportRoi: RoiFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.000000335276126861572, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [34.65539187777202, 31.78757523352489],
            [34.6597422757896, 31.785892991143882],
            [34.66321902830552, 31.78978786608515],
            [34.65779886028196, 31.79057591420748],
            [34.65539187777202, 31.78757523352489],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};
export const sanitizeBboxRequestMock = {
  polygon: {
    type: 'Polygon',
    coordinates: [
      [
        [34.86025969360023, 32.297819227383755],
        [34.86025969360023, 32.29696357462812],
        [34.86612643893457, 32.29696357462812],
        [34.86612643893457, 32.297819227383755],
        [34.86025969360023, 32.297819227383755],
      ],
    ],
  } as Polygon,
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
  } as Polygon,
  zoom: 0,
};

export const notIntersectedPolygon: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [34.88947511126764, 32.32874115927288],
      [34.90334965519068, 32.328129635917946],
      [34.90664229896407, 32.33629836392919],
      [34.88947511126764, 32.32874115927288],
    ],
  ],
};
export const sanitizeBboxMock: BBox = [0, -90, 180, 90];
