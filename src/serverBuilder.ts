import express, { Router } from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import { OpenapiViewerRouter, OpenapiRouterConfig } from '@map-colonies/openapi-express-viewer';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import httpLogger from '@map-colonies/express-access-log-middleware';
import { SERVICES } from './common/constants';
import { IConfig } from './common/interfaces';
import { STORAGE_ROUTER_SYMBOL } from './storage/routes/storageRouter';
import { CREATE_PACKAGE_ROUTER_SYMBOL } from './createPackage/routes/createPackageRouter';
import { TASKS_ROUTER_SYMBOL } from './tasks/routes/tasksRouter';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(STORAGE_ROUTER_SYMBOL) private readonly createStorageRouter: Router,
    @inject(CREATE_PACKAGE_ROUTER_SYMBOL) private readonly createPackageRouter: Router,
    @inject(TASKS_ROUTER_SYMBOL) private readonly tasksRouter: Router
  ) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    this.registerPreRoutesMiddleware();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    return this.serverInstance;
  }

  private buildDocsRoutes(): void {
    const openapiRouter = new OpenapiViewerRouter(this.config.get<OpenapiRouterConfig>('openapiConfig'));
    openapiRouter.setup();
    this.serverInstance.use(this.config.get<string>('openapiConfig.basePath'), openapiRouter.getRouter());
  }

  private buildRoutes(): void {
    this.serverInstance.use('/storage', this.createStorageRouter);
    this.serverInstance.use('/create', this.createPackageRouter);
    this.serverInstance.use('/', this.tasksRouter);
    this.buildDocsRoutes();
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use(httpLogger({ logger: this.logger, ignorePaths: ['/docs'] }));

    if (this.config.get<boolean>('server.response.compression.enabled')) {
      this.serverInstance.use(compression(this.config.get<compression.CompressionFilter>('server.response.compression.options')));
    }

    this.serverInstance.use(bodyParser.json(this.config.get<bodyParser.Options>('server.request.payload')));

    const ignorePathRegex = new RegExp(`^${this.config.get<string>('openapiConfig.basePath')}/.*`, 'i');
    const apiSpecPath = this.config.get<string>('openapiConfig.filePath');
    // todo - allowUnknownQueryParameters: true, its temporary  patch - should add proxy as permanent solution to except token jwt auth
    this.serverInstance.use(
      OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: { allowUnknownQueryParameters: true }, ignorePaths: ignorePathRegex })
    );
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware());
  }
}
