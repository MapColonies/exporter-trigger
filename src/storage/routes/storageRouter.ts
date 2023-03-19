import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { StorageController } from '../controllers/storageController';

const storageRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(StorageController);

  router.get('/', controller.getStorage);

  return router;
};

export const STORAGE_ROUTER_SYMBOL = Symbol('storageFactory');

export { storageRouterFactory };
