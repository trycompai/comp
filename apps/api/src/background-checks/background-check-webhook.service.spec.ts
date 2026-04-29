import { UnauthorizedException } from '@nestjs/common';
import { db, Prisma } from '@db';
import { createHmac } from 'node:crypto';
import { BackgroundCheckIdentityClient } from './background-check-identity.client';
import { BackgroundCheckPaymentService } from './background-check-payment.service';
import { BackgroundChecksService } from './background-checks.service';

jest.mock('@db', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message: string, options: { code: string }) {
      super(message);
      this.code = options.code;
    }
  }

  return {
    Prisma: { PrismaClientKnownRequestError },
    db: {
      backgroundCheckRequest: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      backgroundCheckWebhookEvent: {
        create: jest.fn(),
      },
    },
  };
});

const mockedDb = db as jest.Mocked<typeof db>;

function mockAsync<T>(fn: unknown): jest.MockedFunction<() => Promise<T>> {
  return fn as jest.MockedFunction<() => Promise<T>>;
}

function makeSignature(rawBody: string, timestamp: string): string {
  return createHmac('sha256', 'whsec_test')
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

function webhookPayload() {
  return {
    eventId: 'evt_1',
    type: 'background_check.status_changed',
    data: {
      id: 'check_1',
      status: 'completed_with_flags',
      candidateName: 'Ada Lovelace',
      candidateEmail: 'ada@example.com',
      metadata: { compOrganizationId: 'org_1', compMemberId: 'mem_1' },
      statuses: {
        identity: 'passed',
        employment: 'verified',
        references: 'partially_verified',
        rightToWork: 'extracted',
        adjudication: 'candidate_available',
      },
      createdAt: 1777464000000,
      updatedAt: 1777464000000,
      completedAt: null,
    },
  };
}

describe('BackgroundChecksService webhooks', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      BACKGROUND_CHECK_WEBHOOK_SECRET: 'whsec_test',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects invalid and stale webhook signatures', async () => {
    const service = new BackgroundChecksService(
      {} as unknown as BackgroundCheckIdentityClient,
      {} as unknown as BackgroundCheckPaymentService,
    );

    await expect(
      service.handleWebhook({
        rawBody: Buffer.from('{}'),
        headers: {
          'x-background-check-timestamp': String(Date.now()),
          'x-background-check-signature': 'bad',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const staleTimestamp = String(Date.now() - 10 * 60 * 1000);
    await expect(
      service.handleWebhook({
        rawBody: Buffer.from('{}'),
        headers: {
          'x-background-check-timestamp': staleTimestamp,
          'x-background-check-signature': makeSignature('{}', staleTimestamp),
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('updates status fields and report snapshots from webhook payloads', async () => {
    const payload = webhookPayload();
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Date.now());
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findFirst>>>(
      mockedDb.backgroundCheckRequest.findFirst,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
      employeeName: 'Ada',
      employeeEmail: 'old@example.com',
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.findFirst>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckWebhookEvent.create>>>(
      mockedDb.backgroundCheckWebhookEvent.create,
    ).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof db.backgroundCheckWebhookEvent.create>>,
    );
    const reportSnapshot = {
      identityVerification: { status: 'passed' },
      report: { flags: ['Manual review required'] },
    };
    const identityClient = {
      getBackgroundCheck: jest.fn().mockResolvedValue(reportSnapshot),
    };
    const service = new BackgroundChecksService(
      identityClient as unknown as BackgroundCheckIdentityClient,
      {} as unknown as BackgroundCheckPaymentService,
    );

    await service.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: {
        'x-background-check-timestamp': timestamp,
        'x-background-check-signature': makeSignature(rawBody, timestamp),
      },
    });

    expect(identityClient.getBackgroundCheck).toHaveBeenCalledWith('check_1');
    expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'completed_with_flags',
          identityStatus: 'passed',
          employmentStatus: 'verified',
          referenceStatus: 'partially_verified',
          reportSnapshot,
          reportSyncedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('updates terminal status when report snapshot fetch fails', async () => {
    const payload = webhookPayload();
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Date.now());
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findFirst>>>(
      mockedDb.backgroundCheckRequest.findFirst,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
      employeeName: 'Ada',
      employeeEmail: 'old@example.com',
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.findFirst>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckWebhookEvent.create>>>(
      mockedDb.backgroundCheckWebhookEvent.create,
    ).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof db.backgroundCheckWebhookEvent.create>>,
    );
    const identityClient = {
      getBackgroundCheck: jest.fn().mockRejectedValue(new Error('unavailable')),
    };
    const service = new BackgroundChecksService(
      identityClient as unknown as BackgroundCheckIdentityClient,
      {} as unknown as BackgroundCheckPaymentService,
    );

    await service.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: {
        'x-background-check-timestamp': timestamp,
        'x-background-check-signature': makeSignature(rawBody, timestamp),
      },
    });

    expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          reportSnapshot: expect.anything(),
          reportSyncedAt: expect.anything(),
        }),
      }),
    );
  });

  it('does not fetch report snapshots for non-terminal webhooks', async () => {
    const payload = webhookPayload();
    payload.data.status = 'in_progress';
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Date.now());
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findFirst>>>(
      mockedDb.backgroundCheckRequest.findFirst,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
      employeeName: 'Ada',
      employeeEmail: 'old@example.com',
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.findFirst>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckWebhookEvent.create>>>(
      mockedDb.backgroundCheckWebhookEvent.create,
    ).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof db.backgroundCheckWebhookEvent.create>>,
    );
    const identityClient = { getBackgroundCheck: jest.fn() };
    const service = new BackgroundChecksService(
      identityClient as unknown as BackgroundCheckIdentityClient,
      {} as unknown as BackgroundCheckPaymentService,
    );

    await service.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: {
        'x-background-check-timestamp': timestamp,
        'x-background-check-signature': makeSignature(rawBody, timestamp),
      },
    });

    expect(identityClient.getBackgroundCheck).not.toHaveBeenCalled();
    expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'in_progress' }),
      }),
    );
  });

  it('dedupes webhook events', async () => {
    const payload = webhookPayload();
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Date.now());
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findFirst>>>(
      mockedDb.backgroundCheckRequest.findFirst,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
      employeeName: 'Ada',
      employeeEmail: 'old@example.com',
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.findFirst>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckWebhookEvent.create>>>(
      mockedDb.backgroundCheckWebhookEvent.create,
    ).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const service = new BackgroundChecksService(
      {} as unknown as BackgroundCheckIdentityClient,
      {} as unknown as BackgroundCheckPaymentService,
    );

    const result = await service.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: {
        'x-background-check-timestamp': timestamp,
        'x-background-check-signature': makeSignature(rawBody, timestamp),
      },
    });

    expect(result).toEqual({ ok: true, duplicate: true });
    expect(mockedDb.backgroundCheckRequest.update).not.toHaveBeenCalled();
  });
});
