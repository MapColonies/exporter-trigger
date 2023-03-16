import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';

const findCompletedJobMock = jest.fn();
const findInProgressJobMock = jest.fn();
const findPendingJobMock = jest.fn();
const createMock = jest.fn();
const createExportMock = jest.fn();
const createJobMock = jest.fn();
const getInProgressJobsMock = jest.fn();
const updateJobMock = jest.fn();
const validateAndUpdateExpirationMock = jest.fn();
const getExportJobsMock = jest.fn();
const findExportJobMock = jest.fn();
const deleteTaskByIdMock = jest.fn();

const jobManagerWrapperMock = {
  createJob: createJobMock,
  findCompletedJob: findCompletedJobMock,
  findInProgressJob: findInProgressJobMock,
  findPendingJob: findPendingJobMock,
  findExportJob: findExportJobMock,
  create: createMock,
  createExport: createExportMock,
  getInProgressJobs: getInProgressJobsMock,
  updateJob: updateJobMock,
  getExportJobs: getExportJobsMock,
  validateAndUpdateExpiration: validateAndUpdateExpirationMock,
  deleteTaskById: deleteTaskByIdMock,
} as unknown as JobManagerWrapper;

export {
  jobManagerWrapperMock,
  createMock,
  createExportMock,
  createJobMock,
  findCompletedJobMock,
  findInProgressJobMock,
  findPendingJobMock,
  findExportJobMock,
  validateAndUpdateExpirationMock,
  getInProgressJobsMock as getInProgressJobsMock,
  updateJobMock,
  getExportJobsMock,
  deleteTaskByIdMock,
};
