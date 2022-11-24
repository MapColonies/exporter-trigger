import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';

const findCompletedJobMock = jest.fn();
const findInProgressJobMock = jest.fn();
const findPendingJobMock = jest.fn();
const createMock = jest.fn();
const createJobMock = jest.fn();
const getInProgressJobsMock = jest.fn();
const updateJobMock = jest.fn();
const validateAndUpdateExpirationMock = jest.fn();

const jobManagerWrapperMock = {
  createJob: createJobMock,
  findCompletedJob: findCompletedJobMock,
  findInProgressJob: findInProgressJobMock,
  findPendingJob: findPendingJobMock,
  create: createMock,
  getInProgressJobs: getInProgressJobsMock,
  updateJob: updateJobMock,
  validateAndUpdateExpiration: validateAndUpdateExpirationMock,
} as unknown as JobManagerWrapper;

export {
  jobManagerWrapperMock,
  createMock,
  createJobMock,
  findCompletedJobMock,
  findInProgressJobMock,
  findPendingJobMock,
  validateAndUpdateExpirationMock,
  getInProgressJobsMock as getInProgressJobsMock,
  updateJobMock,
};
