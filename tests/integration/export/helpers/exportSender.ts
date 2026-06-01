import type { Application } from 'express';
import supertest from 'supertest';
import type { CreateExportRequest } from '@src/utils/zod/schemas';

export class ExportSender {
  public constructor(private readonly app: Application) {}

  public async export(body: CreateExportRequest): Promise<supertest.Response> {
    return supertest.agent(this.app).post(`/export`).set('Content-Type', 'application/json').send(body);
  }

  public async getStatusByJobId(jobId: string): Promise<supertest.Response> {
    return supertest.agent(this.app).get(`/export/${jobId}/status`).set('Content-Type', 'application/json').send();
  }
}
