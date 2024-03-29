import * as supertest from 'supertest';
import { ICreatePackage, ICreatePackageRoi } from '../../../../src/common/interfaces';

export class CreatePackageSender {
  public constructor(private readonly app: Express.Application) {}

  public async create(body: ICreatePackage): Promise<supertest.Response> {
    return supertest.agent(this.app).post(`/create`).set('Content-Type', 'application/json').send(body);
  }

  public async createPackageRoi(body: ICreatePackageRoi): Promise<supertest.Response> {
    return supertest.agent(this.app).post(`/create/roi`).set('Content-Type', 'application/json').send(body);
  }
}
