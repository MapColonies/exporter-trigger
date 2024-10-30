import { container } from 'tsyringe';
import jsLogger from '@map-colonies/js-logger';
import { registerDefaultConfig } from '../../mocks/config';
import { multiplePolygonsFeatureCollection, jobRoiFeature, containedExportRoi, notContainedExportRoi } from '../../mocks/geometryMocks';
import { checkFeatures } from '../../../src/utils/geometry';
import { SERVICES } from '../../../src/common/constants';

describe('Geometry', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    container.register(SERVICES.LOGGER, { useValue: logger });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkFeatures', () => {
    it('should return true when the featureCollection are strictly equal and not single polygons', () => {
      const jobRoi = multiplePolygonsFeatureCollection;
      const exportRoi = multiplePolygonsFeatureCollection;
      const response = checkFeatures(jobRoi, exportRoi);

      expect(response).toBe(true);
    });

    it('should return true when the jobRoi and exportRoi are single polygons and export is contained', () => {
      const jobRoi = jobRoiFeature;
      const exportRoi = containedExportRoi;
      const response = checkFeatures(jobRoi, exportRoi);

      expect(response).toBe(true);
    });

    it('should return false when the exportRoi is not contained in jobRoi', () => {
      const jobRoi = jobRoiFeature;
      const exportRoi = notContainedExportRoi;
      const response = checkFeatures(jobRoi, exportRoi);

      expect(response).toBe(false);
    });
  });
});
