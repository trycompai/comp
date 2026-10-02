import { Test } from '@nestjs/testing';
import { AttachmentsService } from '../attachments/attachments.service';
import { TrustEmailService } from './email.service';
import { NdaPdfService } from './nda-pdf.service';
import { PolicyPdfRendererService } from './policy-pdf-renderer.service';
import { TrustCustomFrameworkService } from './trust-custom-framework.service';
import { TrustAccessService } from './trust-access.service';
import { enqueueTrustAccessSubmission } from './trust-access-submission';
import { Logger } from '@nestjs/common';

jest.mock('@trigger.dev/sdk', () => ({ tasks: { trigger: jest.fn() } }));
jest.mock('@db', () => ({
  db: {
    trust: { findFirst: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    trustAccessGrant: { findFirst: jest.fn() },
    trustAccessRequest: { findFirst: jest.fn(), create: jest.fn() },
    trustNDAAgreement: { findUnique: jest.fn() },
  },
  Prisma: {},
  TrustFramework: {},
}));
jest.mock('../app/s3', () => ({ s3Client: null }));

const mockDb = jest.requireMock<{
  db: {
    trust: { findFirst: jest.Mock; findUnique: jest.Mock; upsert: jest.Mock };
    trustAccessGrant: { findFirst: jest.Mock };
    trustAccessRequest: { findFirst: jest.Mock; create: jest.Mock };
    trustNDAAgreement: { findUnique: jest.Mock };
  };
}>('@db').db;
const mockTrigger = jest.requireMock<{ tasks: { trigger: jest.Mock } }>(
  '@trigger.dev/sdk',
).tasks.trigger;
const submission = { name: 'Jane', email: 'Jane@example.com' };

describe('TrustAccessService uniform asynchronous submissions', () => {
  let service: TrustAccessService;
  beforeEach(async () => {
    jest.resetAllMocks();
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      providers: [
        TrustAccessService,
        ...[
          AttachmentsService,
          TrustEmailService,
          NdaPdfService,
          PolicyPdfRendererService,
          TrustCustomFrameworkService,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    }).compile();
    service = module.get(TrustAccessService);
    mockDb.trust.findFirst.mockResolvedValue({ organizationId: 'org_local' });
    mockTrigger.mockResolvedValue({ id: 'run_local' });
  });

  it('preserves optional null fields accepted by the HTTP DTO', async () => {
    await enqueueTrustAccessSubmission({
      kind: 'request',
      organizationId: 'org_local',
      email: submission.email,
      request: {
        name: 'Jane',
        company: null,
        jobTitle: null,
        purpose: null,
        requestedDurationDays: null,
      },
    });
    expect(mockTrigger).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        request: {
          name: 'Jane',
          company: null,
          jobTitle: null,
          purpose: null,
          requestedDurationDays: null,
        },
      }),
      expect.any(Object),
    );
  });

  it('rejects invalid submission input with 400 before enqueue', async () => {
    await expect(
      enqueueTrustAccessSubmission({
        kind: 'reclaim',
        organizationId: 'org_local',
        email: 'invalid-email',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('accepts Unicode email local parts allowed by the HTTP DTO validator', async () => {
    await enqueueTrustAccessSubmission({
      kind: 'reclaim',
      organizationId: 'org_local',
      email: 'jānē@example.com',
    });
    expect(mockTrigger).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ email: 'jānē@example.com' }),
      expect.any(Object),
    );
  });

  it.each(['active grant', 'pending request', 'new request'])(
    'queues %s without inspecting email state',
    async (state) => {
      mockDb.trustAccessGrant.findFirst.mockResolvedValue(
        state === 'active grant' ? { id: 'tag_local' } : null,
      );
      mockDb.trustAccessRequest.findFirst.mockResolvedValue(
        state === 'pending request' ? { id: 'tar_local' } : null,
      );
      await expect(
        service.createAccessRequest('acme', submission, '127.0.0.1', 'test'),
      ).resolves.toEqual({
        message:
          'Your access request has been received. If you already have approved access, a fresh access link will be sent to your email.',
      });
      expect(mockTrigger).toHaveBeenCalledTimes(1);
      expect(mockTrigger).toHaveBeenCalledWith(
        'trust-portal-process-access-submission',
        {
          kind: 'request',
          organizationId: 'org_local',
          email: 'jane@example.com',
          request: { name: 'Jane' },
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        },
        expect.objectContaining({ idempotencyKeyTTL: '5m' }),
      );
      expect(mockDb.trustAccessGrant.findFirst).not.toHaveBeenCalled();
      expect(mockDb.trustAccessRequest.findFirst).not.toHaveBeenCalled();
      expect(mockDb.trustAccessRequest.create).not.toHaveBeenCalled();
    },
  );

  it.each(['active grant', 'no grant'])(
    'queues reclaim for %s without inspecting email state',
    async () => {
      await expect(
        service.reclaimAccess(
          'acme',
          submission.email,
          'security-questionnaire',
        ),
      ).resolves.toEqual({
        message:
          'If an active access grant exists for this email, an access link will be sent.',
      });
      expect(mockTrigger).toHaveBeenCalledWith(
        'trust-portal-process-access-submission',
        {
          kind: 'reclaim',
          organizationId: 'org_local',
          email: 'jane@example.com',
          query: 'security-questionnaire',
        },
        expect.objectContaining({ idempotencyKeyTTL: '5m' }),
      );
      expect(mockDb.trustAccessGrant.findFirst).not.toHaveBeenCalled();
    },
  );

  it('uses the same recipient queue for request and reclaim and normalizes case', async () => {
    await service.createAccessRequest('acme', submission, undefined, undefined);
    await service.reclaimAccess('acme', 'jane@example.com');
    const requestOptions: unknown = mockTrigger.mock.calls[0][2];
    expect(mockTrigger.mock.calls[1][2]).toEqual(
      expect.objectContaining({
        concurrencyKey: expect.any(String),
      }),
    );
    if (
      typeof requestOptions !== 'object' ||
      !requestOptions ||
      !('concurrencyKey' in requestOptions)
    ) {
      throw new Error('Missing recipient concurrency key');
    }
    expect(mockTrigger.mock.calls[1][2]).toHaveProperty(
      'concurrencyKey',
      requestOptions.concurrencyKey,
    );
  });

  it.each(['active grant', 'pending request', 'new request'])(
    'returns the same queue failure for %s',
    async () => {
      mockTrigger.mockRejectedValue(new Error('queue unavailable'));
      await expect(
        service.createAccessRequest('acme', submission, undefined, undefined),
      ).rejects.toMatchObject({ status: 503 });
      await expect(
        service.reclaimAccess('acme', submission.email),
      ).rejects.toMatchObject({ status: 503 });
      expect(mockDb.trustAccessGrant.findFirst).not.toHaveBeenCalled();
      expect(mockDb.trustAccessRequest.findFirst).not.toHaveBeenCalled();
    },
  );

  it('waits for durable enqueue to succeed before returning', async () => {
    let release: (() => void) | undefined;
    mockTrigger.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    let settled = false;
    const result = service.reclaimAccess('acme', submission.email).then(() => {
      settled = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(settled).toBe(false);
    if (!release) throw new Error('Queue was not invoked');
    release();
    await result;
    expect(settled).toBe(true);
  });

  it.each(['missing portal', 'draft portal'])(
    'rejects %s without queuing or writing',
    async () => {
      mockDb.trust.findFirst.mockResolvedValue(null);
      await expect(
        service.createAccessRequest('acme', submission, undefined, undefined),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.reclaimAccess('acme', submission.email),
      ).rejects.toMatchObject({ status: 404 });
      expect(mockTrigger).not.toHaveBeenCalled();
      expect(mockDb.trust.upsert).not.toHaveBeenCalled();
    },
  );

  it.each(['expired', 'void'])(
    '%s NDA cannot recreate a missing portal',
    async (state) => {
      mockDb.trustNDAAgreement.findUnique.mockResolvedValue({
        id: 'tna_local',
        organizationId: 'org_local',
        signTokenExpiresAt: new Date(
          Date.now() + (state === 'expired' ? -1000 : 10000),
        ),
        status: state === 'void' ? 'void' : 'pending',
        accessRequest: {
          name: 'Jane',
          email: 'jane@example.com',
          organization: { name: 'Acme' },
        },
      });
      mockDb.trust.findUnique.mockResolvedValue(null);
      await expect(service.getNdaByToken('old-token')).resolves.toMatchObject({
        status: state,
        portalUrl: null,
      });
      expect(mockDb.trust.upsert).not.toHaveBeenCalled();
    },
  );
});
