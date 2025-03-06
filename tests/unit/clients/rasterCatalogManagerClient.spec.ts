import jsLogger from '@map-colonies/js-logger';
import { NotFoundError } from '@map-colonies/error-types';
import { trace } from '@opentelemetry/api';
import { RasterCatalogManagerClient } from '../../../src/clients/rasterCatalogManagerClient';
import { layerInfo } from '../../mocks/data';

let rasterCatalogManagerClient: RasterCatalogManagerClient;
let post: jest.Mock;

describe('RasterCatalogManagerClient', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    rasterCatalogManagerClient = new RasterCatalogManagerClient(logger, trace.getTracer('testTracer'));
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('findLayer', () => {
    it('should throw an error for not found layer', async () => {
      const layerId = '6007f15c-8978-4c83-adcb-655fb2185856';
      post = jest.fn();
      (rasterCatalogManagerClient as unknown as { post: () => unknown }).post = post.mockReturnValue([]);
      const action = async () => rasterCatalogManagerClient.findLayer(layerId);

      await expect(action()).rejects.toThrow(NotFoundError);
    });

    it('should return layer as a result of success', async () => {
      const layerId = '6007f15c-8978-4c83-adcb-655fb2185856';
      post = jest.fn();
      (rasterCatalogManagerClient as unknown as { post: () => unknown }).post = post.mockReturnValue([layerInfo]);
      const action = async () => rasterCatalogManagerClient.findLayer(layerId);

      await expect(action()).resolves.toBe(layerInfo);
    });
  });
});
