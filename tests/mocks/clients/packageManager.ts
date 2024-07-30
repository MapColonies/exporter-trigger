import { CreatePackageManager } from '../../../src/createPackage/models/createPackageManager';

const createPackageMock = jest.fn();
const createJsonMetadataMock = jest.fn();
const createExportJsonMetadataMock = jest.fn();
const getSeparatorMock = jest.fn();
const sanitizeBboxMock = jest.fn();
const checkForDuplicateMock = jest.fn();
const checkForCompletedMock = jest.fn();

const packageManagerMock = {
  createPackage: createPackageMock,
  createJsonMetadata: createJsonMetadataMock,
  createExportJsonMetadata: createExportJsonMetadataMock,
  getSeparator: getSeparatorMock,
  sanitizeBbox: sanitizeBboxMock,
  checkForDuplicate: checkForDuplicateMock,
  checkForCompleted: checkForCompletedMock,
} as unknown as CreatePackageManager;

export {
  packageManagerMock,
  createPackageMock,
  createJsonMetadataMock,
  getSeparatorMock,
  sanitizeBboxMock,
  checkForDuplicateMock,
  checkForCompletedMock,
  createExportJsonMetadataMock,
};
