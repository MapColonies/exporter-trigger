import { Application } from 'express';
import supertest from 'supertest';

export class StorageSender {
  public constructor(private readonly app: Application) {}

  public async getStorage(): Promise<supertest.Response> {
    return supertest.agent(this.app).get(`/storage`).set('Content-Type', 'application/json').send();
  }
}
