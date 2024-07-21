import { Span } from '@opentelemetry/api';

const setStatusMock = jest.fn();
const recordExceptionMock = jest.fn();
const endMock = jest.fn();

const spanMock = {
  setStatus: setStatusMock,
  recordException: recordExceptionMock,
  end: endMock,
} as unknown as Span;

const startSpanMock = jest.fn().mockReturnValue(spanMock);
const startActiveSpanMock = jest.fn();

export { startSpanMock, startActiveSpanMock, spanMock, setStatusMock, recordExceptionMock, endMock };
