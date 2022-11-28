import { ITileRange } from '@map-colonies/mc-utils';
import { configMock, registerDefaultConfig } from '../../../mocks/config';
import * as utils from '../../../../src/common/utils';

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
      const tileEstimatedSize: number = configMock.get('jpegTileEstimatedSizeInBytes'); // todo - on future will be affected by tile size configuration => png \ jpeg
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
});
