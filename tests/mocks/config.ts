import config from 'config';
import { get, has } from 'lodash';
import { IConfig } from '../../src/common/interfaces';

let mockConfig: Record<string, unknown> = {};
const getMock = jest.fn();
const hasMock = jest.fn();

const configMock: IConfig = {
  get: getMock,
  has: hasMock,
};

const init = (): void => {
  getMock.mockImplementation((key: string): unknown => {
    return mockConfig[key] ?? config.get(key);
  });
};

const setValue = (key: string | Record<string, unknown>, value?: unknown): void => {
  if (typeof key === 'string') {
    mockConfig[key] = value;
  } else {
    mockConfig = { ...mockConfig, ...key };
  }
};

const clear = (): void => {
  mockConfig = {};
};

const setConfigValues = (values: Record<string, unknown>): void => {
  getMock.mockImplementation((key: string) => {
    const value: unknown = (get as (object: Record<string, unknown>, path: string) => unknown)(values, key) ?? config.get(key);
    return value;
  });
  hasMock.mockImplementation((key: string) => (has as (object: Record<string, unknown>, path: string) => boolean)(values, key) || config.has(key));
};

const registerDefaultConfig = (): void => {
  const config = {
    domain: 'RASTER',
    openapiConfig: {
      filePath: './openapi3.yaml',
      basePath: '/docs',
      rawPath: '/api',
      uiPath: '/api',
    },
    telemetry: {
      logger: {
        level: 'info',
        prettyPrint: false,
      },
      tracing: {
        enabled: false,
        url: 'http://mock_trace_url/collector',
      },
    },
    server: {
      port: '8080',
      request: {
        payload: {
          limit: '1mb',
        },
      },
      response: {
        compression: {
          enabled: true,
          options: null,
        },
      },
    },
    tilesProvider: 'S3',
    gpkgsLocation: '/app/tiles_outputs/gpkgs',
    cleanupExpirationDays: 30,
    storageEstimation: {
      jpegTileEstimatedSizeInBytes: 12500,
      pngTileEstimatedSizeInBytes: 12500,
      storageFactorBuffer: 1.25,
    },
    externalClientsConfig: {
      clientsUrls: {
        jobManager: {
          url: 'http://job-manager',
        },
        rasterCatalogManager: {
          url: 'http://raster-catalog-manager',
        },
      },
      httpRetry: {
        attempts: 5,
        delay: 'exponential',
        shouldResetTimeout: true,
      },
      disableHttpClientLogs: false,
      roiBufferMeter: 5,
      minContainedPercentage: 75,
    },
    jobDefinitions: {
      tasks: {
        init: {
          type: 'init',
        },
      },
      jobs: {
        export: {
          type: 'Export',
        },
      },
    },
  };
  setConfigValues(config);
};

export { getMock, hasMock, configMock, setValue, clear, init, setConfigValues, registerDefaultConfig };
