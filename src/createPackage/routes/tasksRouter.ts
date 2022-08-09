import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { CreatePackageController } from '../controllers/createPackageController';
import { TasksController } from '../controllers/tasksController';

const tasksRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(TasksController);

  router.get('/taskStatus/:jobId', controller.getTaskStatusByJobId);

  return router;
};

export const TASKS_ROUTER_SYMBOL = Symbol('tasksFactory');

export { tasksRouterFactory };
