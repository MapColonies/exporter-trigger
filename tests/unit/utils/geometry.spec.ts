import { container } from 'tsyringe';
import jsLogger from '@map-colonies/js-logger';
import * as turf from '@turf/turf';
import { registerDefaultConfig } from '../../mocks/config';
import {
  multiplePolygonsFeatureCollection,
  jobRoiFeature,
  containedExportRoi,
  notContainedExportRoi,
  sanitizeBboxMock,
  sanitizeBboxRequestMock,
  notIntersectedPolygon,
} from '../../mocks/geometryMocks';
import { checkFeaturesResemblance, sanitizeBbox } from '../../../src/utils/geometry';
import { SERVICES } from '../../../src/common/constants';

describe('Geometry Utils', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    container.register(SERVICES.LOGGER, { useValue: logger });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkFeaturesResemblance', () => {
    it('should return true when the featureCollection are strictly equal and not single polygons', () => {
      const jobRoi = multiplePolygonsFeatureCollection;
      const exportRoi = multiplePolygonsFeatureCollection;
      const response = checkFeaturesResemblance(jobRoi, exportRoi);

      expect(response).toBe(true);
    });

    it('should return true when the jobRoi and exportRoi are single polygons and export is contained', () => {
      const jobRoi = jobRoiFeature;
      const exportRoi = containedExportRoi;
      const response = checkFeaturesResemblance(jobRoi, exportRoi);

      expect(response).toBe(true);
    });

    it('should return false when the exportRoi is not contained in jobRoi', () => {
      const jobRoi = jobRoiFeature;
      const exportRoi = notContainedExportRoi;
      const response = checkFeaturesResemblance(jobRoi, exportRoi);

      expect(response).toBe(false);
    });
  });

  describe('sanitizedBbox', () => {
    it('should return the sanitized bbox for zoom 0', () => {
      const response = sanitizeBbox(sanitizeBboxRequestMock);
      expect(response).toStrictEqual(sanitizeBboxMock);
    });

    it('should return null when polygon and footprint dont intersect', () => {
      const response = sanitizeBbox({ ...sanitizeBboxRequestMock, polygon: notIntersectedPolygon });
      expect(response).toBeNull();
    });

    it('should throw error when some internal error occurred', () => {
      jest.spyOn(turf, 'feature').mockImplementation(() => {
        throw new Error('Mocked feature error');
      });
      const action = () => sanitizeBbox({ ...sanitizeBboxRequestMock, polygon: notIntersectedPolygon });
      expect(action).toThrow(Error);
    });
  });
});
