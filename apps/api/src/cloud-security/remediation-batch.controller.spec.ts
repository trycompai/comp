import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { RemediationBatchController } from './remediation-batch.controller';
import { RemediationBatchService } from './remediation-batch.service';

jest.mock('../auth/auth.server', () => ({ auth: { api: {} } }));
jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));
jest.mock('@db', () => ({ db: {} }));
jest.mock('@trigger.dev/sdk', () => ({ auth: {}, runs: {} }));

describe('RemediationBatchController permissions and validation', () => {
  let app: INestApplication<Server>;
  const service = {
    create: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    getActive: jest.fn(),
    skip: jest.fn(),
  };
  const finding = { id: 'finding_own', key: 'key', title: 'Finding' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RemediationBatchController],
      providers: [{ provide: RemediationBatchService, useValue: service }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: Record<string, string>;
              isApiKey?: boolean;
              apiKeyScopes?: string[];
              organizationId?: string;
              userId?: string;
            };
          };
        }) => {
          const req = context.switchToHttp().getRequest();
          req.isApiKey = true;
          req.apiKeyScopes =
            req.headers['x-test-access'] === 'write'
              ? ['integration:read', 'integration:update']
              : ['integration:read'];
          req.organizationId = 'org_own';
          req.userId = 'usr_own';
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    service.create.mockResolvedValue({ id: 'rmb_own' });
    service.getActive.mockResolvedValue({ id: 'rmb_own' });
    service.update.mockResolvedValue({ id: 'rmb_own' });
    service.cancel.mockResolvedValue({ id: 'rmb_own' });
  });

  const base = '/cloud-security/remediation/batch';
  it('accepts an authorized writer with validated finding DTOs', async () => {
    await request(app.getHttpServer())
      .post(base)
      .set('x-test-access', 'write')
      .send({ connectionId: 'conn_own', findings: [finding] })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith({
      organizationId: 'org_own',
      userId: 'usr_own',
      body: { connectionId: 'conn_own', findings: [finding] },
    });
  });

  it('allows read-only access to active progress', async () => {
    await request(app.getHttpServer())
      .get(`${base}/active?connectionId=conn_own`)
      .expect(200);
    expect(service.getActive).toHaveBeenCalledWith({
      organizationId: 'org_own',
      connectionId: 'conn_own',
    });
  });

  it.each([
    {
      method: 'post',
      url: base,
      body: { connectionId: 'conn_own', findings: [finding] },
    },
    {
      method: 'post',
      url: `${base}/rmb_own/cancel`,
      body: { runId: 'run_own' },
    },
    { method: 'post', url: `${base}/rmb_own/skip/finding_own`, body: {} },
  ])('denies read-only mutations: $url', async ({ url, body }) => {
    await request(app.getHttpServer()).post(url).send(body).expect(403);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.cancel).not.toHaveBeenCalled();
    expect(service.skip).not.toHaveBeenCalled();
  });

  it('denies read-only run binding', async () => {
    await request(app.getHttpServer())
      .patch(`${base}/rmb_own`)
      .send({ triggerRunId: 'run_own' })
      .expect(403);
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each([
    {
      connectionId: 'conn_own',
      findings: [{ id: 'finding_own', key: 1, title: 'Finding' }],
    },
    { connectionId: 'conn_own', findings: [] },
    {
      connectionId: 'conn_own',
      findings: [finding],
      organizationId: 'org_foreign',
    },
  ])('rejects invalid or forged create bodies: %p', async (body) => {
    await request(app.getHttpServer())
      .post(base)
      .set('x-test-access', 'write')
      .send(body)
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects invalid statuses and malformed run IDs', async () => {
    await request(app.getHttpServer())
      .patch(`${base}/rmb_own`)
      .set('x-test-access', 'write')
      .send({ status: 'invented' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`${base}/rmb_own/cancel`)
      .set('x-test-access', 'write')
      .send({ runId: 'invalid' })
      .expect(400);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.cancel).not.toHaveBeenCalled();
  });
});
