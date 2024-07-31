import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';

const createExportMock = jest.fn();
const updateJobMock = jest.fn();
const validateAndUpdateExpirationMock = jest.fn();
const getExportJobsMock = jest.fn();
const findExportJobMock = jest.fn();
const deleteTaskByIdMock = jest.fn();

const jobManagerWrapperMock = {
  findExportJob: findExportJobMock,
  validateAndUpdateExpirationMock,
  createExport: createExportMock,
  updateJob: updateJobMock,
  getExportJobs: getExportJobsMock,
  validateAndUpdateExpiration: validateAndUpdateExpirationMock,
  deleteTaskById: deleteTaskByIdMock,
} as unknown as JobManagerWrapper;

export {
  jobManagerWrapperMock,
  validateAndUpdateExpirationMock,
  createExportMock,
  findExportJobMock,
  updateJobMock,
  getExportJobsMock,
  deleteTaskByIdMock,
};
