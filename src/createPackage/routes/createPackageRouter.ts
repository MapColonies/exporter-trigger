import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { CreatePackageController } from '../controllers/createPackageController';

const createPackageRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(CreatePackageController);

  router.post('/', controller.create);

  return router;
};

export const CREATE_PACKAGE_ROUTER_SYMBOL = Symbol('createPackageFactory');

export { createPackageRouterFactory };
