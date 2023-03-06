import { ITileRange } from '@map-colonies/mc-utils';
import { configMock, registerDefaultConfig } from '../../../mocks/config';
import * as utils from '../../../../src/common/utils';
import { fc1, fcTooHighResolution } from '../../../mocks/data';

const sanitizedBatchesExample: ITileRange[] = [
  { minX: 1, minY: 0, maxX: 2, maxY: 1, zoom: 0 },
  { minX: 2, minY: 0, maxX: 4, maxY: 2, zoom: 1 },
  { minX: 4, minY: 0, maxX: 8, maxY: 4, zoom: 2 },
  { minX: 8, minY: 0, maxX: 16, maxY: 8, zoom: 3 },
];

describe('Utils', () => {
  beforeEach(() => {
    registerDefaultConfig();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('calculate estimated gpkg size by sanitized bbox', () => {
    it('should return estimated size in bytes to gpkg', () => {
      const tileEstimatedSize: number = configMock.get('storageEstimation.jpegTileEstimatedSizeInBytes'); // todo - on future will be affected by tile size configuration => png \ jpeg
      const result = utils.calculateEstimateGpkgSize(sanitizedBatchesExample, tileEstimatedSize);
      expect(result).toBe(1062500);
    });
  });

  describe('calculate  gpkg name without extention', () => {
    it('should return string name without extention (.gpkg)', () => {
      const fileName = 'test.gpkg';
      const result = utils.getGpkgNameWithoutExt(fileName);
      expect(result).toBe('test');
    });

    it('should return string name without extention file with number of point inside the string', () => {
      const fileName = 'test.test2.test3.gpkg';
      const result = utils.getGpkgNameWithoutExt(fileName);
      expect(result).toBe('test.test2.test3');
    });
  });

  describe('FeatureCollection Utils', () => {
    describe('generateGeoIdentifier', () => {
      it('should return hashed unique id based on roi geometry and be consistent to same ROI', () => {
        const result1 = utils.generateGeoIdentifier(fc1);
        const result2 = utils.generateGeoIdentifier({ ...fc1 });
        const result3 = utils.generateGeoIdentifier(fcTooHighResolution);
        expect(result1).toBe('1a26c1661df10eee54f9727fcdb8b71d');
        expect(result1 === result2).toBe(true);
        expect(result1 === result3).toBe(false);
      });
    });

    describe('parseFeatureCollection', () => {
      it('should return array of 2 IGeometry objects', () => {
        const expectedObjectBase = {
          zoomLevel: 5,
          targetResolutionDeg: 0.02197265625,
          targetResolutionMeter: 2445.98,
        };
        const result = utils.parseFeatureCollection(fc1);
        expect(result).toHaveLength(2);
        expect(result[0]).toStrictEqual({ ...expectedObjectBase, geometry: fc1.features[0].geometry });
        expect(result[1]).toStrictEqual({ ...expectedObjectBase, geometry: fc1.features[1].geometry });
      });

      it('should return array of 1 IGeometry objects', () => {
        const expectedObjectBase = {
          zoomLevel: 22,
          targetResolutionDeg: 1.67638063430786e-7,
          targetResolutionMeter: 0.0185,
        };
        const result = utils.parseFeatureCollection(fcTooHighResolution);
        expect(result).toHaveLength(1);
        expect(result[0]).toStrictEqual({ ...expectedObjectBase, geometry: fcTooHighResolution.features[0].geometry });
      });
    });
  });
});
