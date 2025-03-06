import { registerDefaultConfig } from '../../../mocks/config';
import * as utils from '../../../../src/common/utils';
import { fc1, fcTooHighResolution } from '../../../mocks/data';

describe('Utils', () => {
  beforeEach(() => {
    registerDefaultConfig();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('FeatureCollection Utils', () => {
    describe('parseFeatureCollection', () => {
      it('should return array of 2 IGeometry objects', () => {
        const expectedObjectBase = {
          zoomLevel: 5,
          targetResolutionDeg: 0.02197265625,
          targetResolutionMeter: 2445.98,
          minResolutionDeg: 0.703125,
          minZoomLevel: 0,
        };
        const result = utils.parseFeatureCollection(fc1);
        expect(result).toHaveLength(2);
        expect(result[0]).toStrictEqual({ ...expectedObjectBase, geometry: fc1.features[0].geometry });
        expect(result[1]).toStrictEqual({ ...expectedObjectBase, geometry: fc1.features[1].geometry });
      });

      it('should return array of 1 IGeometry objects', () => {
        const expectedObjectBase = {
          zoomLevel: 21,
          targetResolutionDeg: 0.000000335276126861572,
          targetResolutionMeter: 0.037,
          minResolutionDeg: 0.703125,
          minZoomLevel: 0,
        };
        const result = utils.parseFeatureCollection(fcTooHighResolution);
        expect(result).toHaveLength(1);
        expect(result[0]).toStrictEqual({ ...expectedObjectBase, geometry: fcTooHighResolution.features[0].geometry });
      });
    });
  });
});
