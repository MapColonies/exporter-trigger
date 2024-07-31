import { CreatePackageManager } from '../../../src/createPackage/models/createPackageManager';

const createExportJsonMetadataMock = jest.fn();

const packageManagerMock = {
  createExportJsonMetadata: createExportJsonMetadataMock,
} as unknown as CreatePackageManager;

export { packageManagerMock, createExportJsonMetadataMock };
