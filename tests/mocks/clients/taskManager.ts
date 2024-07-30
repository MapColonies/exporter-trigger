import { TasksManager } from '../../../src/tasks/models/tasksManager';

const getFinalizeJobByIdMock = jest.fn();
const getExportJobsByTaskStatusMock = jest.fn();
const getTaskStatusByJobIdMock = jest.fn();
const sendCallbacksMock = jest.fn();
const sendExportCallbacksMock = jest.fn();
const finalizeJobMock = jest.fn();
const finalizeGPKGSuccessMock = jest.fn();
const finalizeGPKGFailureMock = jest.fn();
const createFinalizeTaskMock = jest.fn();
const deleteTaskByIdMock = jest.fn();

const taskManagerMock = {
  getFinalizeJobById: getFinalizeJobByIdMock,
  getExportJobsByTaskStatus: getExportJobsByTaskStatusMock,
  getTaskStatusByJobId: getTaskStatusByJobIdMock,
  sendCallbacks: sendCallbacksMock,
  sendExportCallbacks: sendExportCallbacksMock,
  finalizeJob: finalizeJobMock,
  finalizeGPKGSuccess: finalizeGPKGSuccessMock,
  finalizeGPKGFailure: finalizeGPKGFailureMock,
  createFinalizeTask: createFinalizeTaskMock,
  deleteTaskById: deleteTaskByIdMock,
} as unknown as TasksManager;

export {
  taskManagerMock,
  getFinalizeJobByIdMock,
  getExportJobsByTaskStatusMock,
  getTaskStatusByJobIdMock,
  sendCallbacksMock,
  sendExportCallbacksMock,
  finalizeJobMock,
  finalizeGPKGSuccessMock,
  finalizeGPKGFailureMock,
  createFinalizeTaskMock,
  deleteTaskByIdMock,
};
