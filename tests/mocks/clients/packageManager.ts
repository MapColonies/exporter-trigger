import { CreatePackageManager } from '../../../src/createPackage/models/createPackageManager';

const createPackageMock = jest.fn();
const createJsonMetadataMock = jest.fn();
const getSeparatorMock = jest.fn();
const sanitizeBboxMock = jest.fn();
const checkForDuplicateMock = jest.fn();
const checkForCompletedMock = jest.fn();
const checkForProcessingMock = jest.fn();
const updateCallbackURLsMock = jest.fn();

const packageManagerMock = {
  createPackage: createPackageMock,
  createJsonMetadata: createJsonMetadataMock,
  getSeparator: getSeparatorMock,
  sanitizeBbox: sanitizeBboxMock,
  checkForDuplicate: checkForDuplicateMock,
  checkForCompleted: checkForCompletedMock,
  checkForProcessing: checkForProcessingMock,
  updateCallbackURLs: updateCallbackURLsMock,
} as unknown as CreatePackageManager;

export {
  packageManagerMock,
  createPackageMock,
  createJsonMetadataMock,
  getSeparatorMock,
  sanitizeBboxMock,
  checkForDuplicateMock,
  checkForCompletedMock,
  checkForProcessingMock,
  updateCallbackURLsMock,
};
