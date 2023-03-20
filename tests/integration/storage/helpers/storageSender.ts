import * as supertest from 'supertest';

export class StorageSender {
  public constructor(private readonly app: Express.Application) {}

  public async getStorage(): Promise<supertest.Response> {
    return supertest.agent(this.app).get(`/storage`).set('Content-Type', 'application/json').send();
  }
}
