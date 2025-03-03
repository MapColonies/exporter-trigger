import { createExportRequestSchema } from '@src/utils/zod/schemas';

const validUserExportRequest = {
  dbId: 'ef03ca54-c68e-4ca8-8432-50ae5ad7a7f8',
  crs: 'EPSG:4326',
  priority: 1,
  callbackURLs: ['https://example.com/callback'],
  description: 'Test export request',
  roi: undefined,
};

const roi = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        maxResolutionDeg: 0.0439453125,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [34.82836896556114, 32.03918441418732],
            [34.81210152170695, 32.03918441418732],
            [34.81210152170695, 32.02539369969462],
            [34.82836896556114, 32.02539369969462],
            [34.82836896556114, 32.03918441418732],
          ],
        ],
      },
    },
  ],
};

describe('SchemasValidations', () => {
  it('should return valid input for a correct request', () => {
    expect(() => createExportRequestSchema.parse({ ...validUserExportRequest })).not.toThrow();
  });

  it('should throw an error if dbId is missing', () => {
    expect(() => createExportRequestSchema.parse({ ...validUserExportRequest, dbId: undefined })).toThrow();
  });

  it('should throw an error if dbId is not a string', () => {
    expect(() => createExportRequestSchema.parse({ ...validUserExportRequest, dbId: 123 })).toThrow();
  });

  it('should allow optional fields to be undefined', () => {
    expect(() => createExportRequestSchema.parse({ dbId: 'ef03ca54-c68e-4ca8-8432-50ae5ad7a7f8' })).not.toThrow();
  });

  it('should throw an error if callbackURLs is not an array of strings', () => {
    expect(() => createExportRequestSchema.parse({ ...validUserExportRequest, callbackURLs: [123] })).toThrow();
  });

  it('should throw an error if priority is not a number', () => {
    expect(() => createExportRequestSchema.parse({ ...validUserExportRequest, priority: 'high' })).toThrow();
  });

  it('should return valid input for a correct request with roi', () => {
    const userInput = createExportRequestSchema.parse({ ...validUserExportRequest, roi: { ...roi } });
    expect(userInput.roi?.features[0]).toHaveProperty('properties.minResolutionDeg');
  });
});
