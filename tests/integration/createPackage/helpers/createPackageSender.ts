import * as supertest from 'supertest';
import { ICreatePackageRoi } from '../../../../src/common/interfaces';

export class CreatePackageSender {
  public constructor(private readonly app: Express.Application) {}

  public async createPackageRoi(body: ICreatePackageRoi): Promise<supertest.Response> {
    return supertest.agent(this.app).post(`/create/roi`).set('Content-Type', 'application/json').send(body);
  }
}
