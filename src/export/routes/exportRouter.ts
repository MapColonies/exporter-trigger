import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { ExportController } from '../controllers/exportController';

const exportRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(ExportController);

  router.post('/', controller.createExport);
  router.get('/:jobId/status', controller.getStatusByJobId);

  return router;
};

export const EXPORT_ROUTER_SYMBOL = Symbol('exportRouter');

export { exportRouterFactory };
