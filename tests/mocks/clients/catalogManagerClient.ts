import { RasterCatalogManagerClient } from '../../../src/clients/rasterCatalogManagerClient';

const findLayerMock = jest.fn();

const catalogManagerMock = {
  findLayer: findLayerMock,
} as unknown as RasterCatalogManagerClient;

export { catalogManagerMock, findLayerMock};
