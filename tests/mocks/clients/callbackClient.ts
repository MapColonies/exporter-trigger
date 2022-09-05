import { CallbackClient } from '../../../src/clients/callbackClient';

const sendMock = jest.fn();

const callbackClientMock = {
  send: sendMock,
} as unknown as CallbackClient;

export { callbackClientMock, sendMock };
