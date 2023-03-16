import { TasksManager } from '../../../src/tasks/models/tasksManager';

const getJobsByTaskStatusMock = jest.fn();
const getFinalizeJobByIdMock = jest.fn();
const getExportJobsByTaskStatusMock = jest.fn();
const getTaskStatusByJobIdMock = jest.fn();
const sendCallbacksMock = jest.fn();
const sendExportCallbacksMock = jest.fn();
const finalizeJobMock = jest.fn();
const finalizeExportJobMock = jest.fn();
const createFinalizeTaskMock = jest.fn();
const deleteTaskByIdMock = jest.fn();

const taskManagerMock = {
  getJobsByTaskStatus: getJobsByTaskStatusMock,
  getFinalizeJobById: getFinalizeJobByIdMock,
  getExportJobsByTaskStatus: getExportJobsByTaskStatusMock,
  getTaskStatusByJobId: getTaskStatusByJobIdMock,
  sendCallbacks: sendCallbacksMock,
  sendExportCallbacks: sendExportCallbacksMock,
  finalizeJob: finalizeJobMock,
  finalizeExportJob: finalizeExportJobMock,
  createFinalizeTask: createFinalizeTaskMock,
  deleteTaskById: deleteTaskByIdMock,
} as unknown as TasksManager;

export {
  taskManagerMock,
  getJobsByTaskStatusMock,
  getFinalizeJobByIdMock,
  getExportJobsByTaskStatusMock,
  getTaskStatusByJobIdMock,
  sendCallbacksMock,
  sendExportCallbacksMock,
  finalizeJobMock,
  finalizeExportJobMock,
  createFinalizeTaskMock,
  deleteTaskByIdMock,
};
