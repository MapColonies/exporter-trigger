import { TaskHandler as QueueHandler } from '@map-colonies/mc-priority-queue';
import { QueueClient } from '../../../src/clients/queueClient';

const dequeueMock = jest.fn();
const rejectMock = jest.fn();
const ackMock = jest.fn();

const queueHandlerForFinalizeTasksMock = {
  dequeue: dequeueMock,
  reject: rejectMock,
  ack: ackMock,
} as unknown as QueueHandler;

const queueClientMock = {
  queueHandlerForFinalizeTasks: queueHandlerForFinalizeTasksMock,
} as unknown as QueueClient;

export { queueClientMock, queueHandlerForFinalizeTasksMock, dequeueMock, rejectMock, ackMock };
