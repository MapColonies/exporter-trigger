/* eslint-disable @typescript-eslint/no-magic-numbers */
import { FeatureCollection } from '@turf/helpers';

export const multiplePolygonsFeatureCollection: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
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
      properties: {},
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

export const jobRoiFeature: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
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

export const containedExportRoi: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
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

export const notContainedExportRoi: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
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
