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
    httpRetry: {
      attempts: 5,
      delay: 'exponential',
      shouldResetTimeout: true,
    },
    jobManager: {
      url: 'http://job-manager-job-manager',
      jobDomain: 'testDomain',
      expirationDays: 30,
    },
    rasterCatalogManager: {
      url: 'http://raster-catalog-manager',
    },
    workerTypes: {
      tiles: {
        jobType: 'rasterTilesExporter',
        taskType: 'rasterTilesExporter',
      },
    },
    tilesProvider: 'S3',
    gpkgsLocation: '/app/tiles_outputs/gpkgs',
    downloadServerUrl: 'http://download-service',
    pollingTimeoutMS: 2000,
    jpegTileEstimatedSizeInBytes: 12500,
    storageFactorBuffer: 1.25,
  };
  setConfigValues(config);
};

export { getMock, hasMock, configMock, setConfigValues, registerDefaultConfig };
