jest.mock('../auth/hybrid-auth.guard', () => ({
  HybridAuthGuard: class {
    canActivate() {
      return true;
    }
  },
}));

import { SecurityPenetrationTestsController } from './security-penetration-tests.controller';
import type { SecurityPenetrationTestsService } from './security-penetration-tests.service';
import type { Request as ExpressRequest } from 'express';

describe('SecurityPenetrationTestsController', () => {
  const originalWebhookBase = process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL;
  const createReportMock = jest.fn();
  const listReportsMock = jest.fn();
  const getReportMock = jest.fn();
  const getReportProgressMock = jest.fn();
  const getReportOutputMock = jest.fn();
  const getReportPdfMock = jest.fn();
  const handleWebhookMock = jest.fn();

  const serviceMock: jest.Mocked<SecurityPenetrationTestsService> = {
    createReport: createReportMock,
    listReports: listReportsMock,
    getReport: getReportMock,
    getReportProgress: getReportProgressMock,
    getReportOutput: getReportOutputMock,
    getReportPdf: getReportPdfMock,
    handleWebhook: handleWebhookMock,
  } as unknown as jest.Mocked<SecurityPenetrationTestsService>;

  const controller = new SecurityPenetrationTestsController(serviceMock);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL = 'https://callback.example.com/webhook';
  });

  afterAll(() => {
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL = originalWebhookBase;
  });

  it('lists reports for the organization', async () => {
    const expectedReports = [{ id: 'run_1', status: 'completed' }];
    listReportsMock.mockResolvedValueOnce(expectedReports);

    const response = await controller.list('org_123');

    expect(listReportsMock).toHaveBeenCalledWith('org_123');
    expect(response).toEqual(expectedReports);
  });

  it('creates report with normalized webhook URL when missing in payload', async () => {
    createReportMock.mockResolvedValueOnce({
      id: 'run_1',
      status: 'provisioning',
    });

    await controller.create('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
    });

    expect(createReportMock).toHaveBeenCalledWith('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      githubToken: undefined,
      configYaml: undefined,
      pipelineTesting: undefined,
      workspace: undefined,
      testMode: undefined,
      mockCheckout: undefined,
      webhookUrl: undefined,
    });
  });

  it('returns a report by id', async () => {
    const expectedReport = { id: 'run_1', status: 'completed' };
    getReportMock.mockResolvedValueOnce(expectedReport);

    const response = await controller.getById('org_123', 'run_1');

    expect(getReportMock).toHaveBeenCalledWith('org_123', 'run_1');
    expect(response).toEqual(expectedReport);
  });

  it('gets progress for a report', async () => {
    const expectedProgress = {
      status: 'running',
      phase: 'scan',
      agent: null,
      completedAgents: 1,
      totalAgents: 3,
      elapsedMs: 1000,
    };
    getReportProgressMock.mockResolvedValueOnce(expectedProgress);

    const response = await controller.getProgress('org_123', 'run_1');

    expect(getReportProgressMock).toHaveBeenCalledWith('org_123', 'run_1');
    expect(response).toEqual(expectedProgress);
  });

  it('gets report output with response headers', async () => {
    getReportOutputMock.mockResolvedValueOnce({
      buffer: Buffer.from('markdown report'),
      contentType: 'text/markdown; charset=utf-8',
      contentDisposition: 'inline; filename="run_1.md"',
    });
    const responseMock = { set: jest.fn() };

    const output = await controller.getReport('org_123', 'run_1', responseMock as never);

    expect(getReportOutputMock).toHaveBeenCalledWith('org_123', 'run_1');
    expect(responseMock.set).toHaveBeenCalledWith({
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    expect(output).toBeDefined();
  });

  it('gets pdf output and applies default attachment filename when missing', async () => {
    getReportPdfMock.mockResolvedValueOnce({
      buffer: Buffer.from('pdf'),
      contentType: 'application/pdf',
    });
    const responseMock = { set: jest.fn() };

    const output = await controller.getPdf('org_123', 'run_1', responseMock as never);

    expect(getReportPdfMock).toHaveBeenCalledWith('org_123', 'run_1');
    expect(responseMock.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="penetration-test-run_1.pdf"',
      'Cache-Control': 'no-store',
    });
    expect(output).toBeDefined();
  });

  it('routes webhook payload through validation and service handler', async () => {
    const requestMock = {
      query: {
        orgId: 'from-query',
      },
      headers: {},
    } as unknown as ExpressRequest;
    const webhookPayload = { id: 'run_2', status: 'completed' };
    handleWebhookMock.mockResolvedValueOnce({
      success: true,
      organizationId: 'org_123',
    });

    await controller.handleWebhook(requestMock, webhookPayload);

    expect(handleWebhookMock).toHaveBeenCalledWith(
      webhookPayload,
      {
        webhookToken: undefined,
        eventId: undefined,
      },
    );
  });

  it('accepts first query value from array form in webhook extraction', async () => {
    const requestMock = {
      query: {
        webhookToken: ['query-token', 'ignored'],
      },
      headers: {},
    } as unknown as ExpressRequest;
    const webhookPayload = { id: 'run_3', status: 'completed' };
    handleWebhookMock.mockResolvedValueOnce({
      success: true,
      organizationId: 'org_123',
    });

    await controller.handleWebhook(requestMock, webhookPayload);

    expect(handleWebhookMock).toHaveBeenCalledWith(
      webhookPayload,
      {
        webhookToken: 'query-token',
        eventId: undefined,
      },
    );
  });

  it('passes webhook token and event id metadata into service handler', async () => {
    const requestMock = {
      query: { webhookToken: 'query-token' },
      headers: {
        'x-webhook-id': 'evt_123',
      },
    } as unknown as ExpressRequest;
    const webhookPayload = { id: 'run_4', status: 'completed' };
    handleWebhookMock.mockResolvedValueOnce({
      success: true,
      organizationId: 'org_123',
    });

    await controller.handleWebhook(requestMock, webhookPayload);

    expect(handleWebhookMock).toHaveBeenCalledWith(
      webhookPayload,
      {
        webhookToken: 'query-token',
        eventId: 'evt_123',
      },
    );
  });
});
