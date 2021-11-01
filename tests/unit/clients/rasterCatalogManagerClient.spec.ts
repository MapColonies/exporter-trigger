import jsLogger from '@map-colonies/js-logger';
import { NotFoundError } from '@map-colonies/error-types';
import { RasterCatalogManagerClient } from '../../../src/clients/rasterCatalogManagerClient';
import { layerFromCatalog } from '../../mocks/data';

let rasterCatalogManagerClient: RasterCatalogManagerClient;
let postStub: jest.Mock;

describe('RasterCatalogManagerClient', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    rasterCatalogManagerClient = new RasterCatalogManagerClient(logger);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('#findLayer', () => {
    it('should throw an error for not found layer', async () => {
      const layerId = '6007f15c-8978-4c83-adcb-655fb2185856';
      postStub = jest.fn();
      (rasterCatalogManagerClient as unknown as { post: () => unknown }).post = postStub.mockReturnValue([undefined]);
      const action = async () => rasterCatalogManagerClient.findLayer(layerId);

      await expect(action).rejects.toThrow(NotFoundError);
    });

    it('should return layer as a result of success', async () => {
      const layerId = '6007f15c-8978-4c83-adcb-655fb2185856';
      postStub = jest.fn();
      (rasterCatalogManagerClient as unknown as { post: () => unknown }).post = postStub.mockReturnValue([layerFromCatalog]);
      const action = async () => rasterCatalogManagerClient.findLayer(layerId);

      await expect(action()).resolves.toBe(layerFromCatalog);
    });
  });
});
