import config from 'config';
import { get, has } from 'lodash';
import { IConfig } from '../../src/common/interfaces';

const getMock = jest.fn();
const hasMock = jest.fn();

const configMock = {
  get: getMock,
  has: hasMock,
} as unknown as IConfig;

const setConfigValues = (values: Record<string, unknown>): void => {
  getMock.mockImplementation((key: string) => {
    const value = get(values, key) ?? config.get(key);
    return value;
  });
  hasMock.mockImplementation((key: string) => has(values, key) || config.has(key));
};

const registerDefaultConfig = (): void => {
  const config = {
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
    downloadServerUrl: 'http://download-service',
    finalizePollingTimeMS: 2000,
    cleanupExpirationDays: 30,
    storageEstimation: {
      jpegTileEstimatedSizeInBytes: 12500,
      pngTileEstimatedSizeInBytes: 12500,
      storageFactorBuffer: 1.25,
      validateStorageSize: true,
    },
    externalClientsConfig: {
      clientsUrls: {
        jobManager: {
          url: 'http://raster-catalog-manager',
          jobDomain: 'RASTER',
          dequeueFinalizeIntervalMs: 1000,
          finalizeTasksAttempts: 5,
        },
        rasterCatalogManager: {
          url: 'http://job-manager-job-manager',
        },
        heartbeatManager: {
          url: 'http://heartbeat-manager-heartbeat-manager',
          heartbeatIntervalMs: 300,
        },
      },
      exportJobAndTaskTypes: {
        jobType: 'rasterTilesExporter',
        taskTilesType: 'rasterTilesExporter',
        taskFinalizeType: 'rasterTilesExporter',
      },
      httpRetry: {
        attempts: 5,
        delay: 'exponential',
        shouldResetTimeout: true,
      },
      disableHttpClientLogs: false,
      roiBuffer: 5,
      minContainedPercentage: 75,
    },
  };
  setConfigValues(config);
};

export { getMock, hasMock, configMock, setConfigValues, registerDefaultConfig };
