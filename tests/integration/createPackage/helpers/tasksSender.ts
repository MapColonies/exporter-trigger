import * as supertest from 'supertest';

export class TasksSender {
  public constructor(private readonly app: Express.Application) {}

  public async getTasksByJobId(jobId: string): Promise<supertest.Response> {
    return supertest.agent(this.app).get(`/taskStatus/${jobId}`).set('Content-Type', 'application/json').send();
  }
}
