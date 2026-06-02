import { BackgroundCheckIdentityClient } from './background-check-identity.client';
import { BillingService } from '../billing/billing.service';
import { BackgroundCheckBillingService } from './background-check-billing.service';
import { BackgroundCheckPaymentService } from './background-check-payment.service';
import { BackgroundChecksService } from './background-checks.service';
import { db, Prisma } from '@db';

jest.mock('@db', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message: string, options: { code: string }) {
      super(message);
      this.code = options.code;
    }
  }

  return {
    BackgroundCheckStatus: {
      invited: 'invited',
      in_progress: 'in_progress',
      in_review: 'in_review',
      completed: 'completed',
      completed_with_flags: 'completed_with_flags',
      failed: 'failed',
      cancelled: 'cancelled',
    },
    Prisma: {
      PrismaClientKnownRequestError,
      JsonNull: 'JsonNull',
    },
    db: {
      backgroundCheckRequest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      backgroundCheckWebhookEvent: {
        create: jest.fn(),
      },
      member: {
        findFirst: jest.fn(),
      },
      organizationBilling: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      securityPenetrationTestRun: {
        count: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
    },
  };
});

const mockedDb = db as jest.Mocked<typeof db>;

function mockAsync<T>(fn: unknown): jest.MockedFunction<() => Promise<T>> {
  return fn as jest.MockedFunction<() => Promise<T>>;
}

function invocationOrder(fn: unknown, index = 0): number {
  return (
    (fn as { mock: { invocationCallOrder: number[] } }).mock
      .invocationCallOrder[index] ?? 0
  );
}

describe('background checks', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      BACKGROUND_CHECK_API_KEY: 'bc_test',
      BACKGROUND_CHECK_API_BASE_URL: 'https://glad-sturgeon-729.convex.site/',
      BACKGROUND_CHECK_WEBHOOK_SECRET: 'whsec_test',
      BACKGROUND_WH_ENDPOINT: '',
      STRIPE_BACKGROUND_CHECK_PRICE_ID: 'price_bg',
      NEXT_PUBLIC_APP_URL: 'https://app.trycomp.ai',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates an Identity request with expected headers and body', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'check_1',
          status: 'invited',
          candidateUrl: 'https://identity.trycomp.ai/cand_1',
        }),
        { status: 200 },
      ),
    );

    const client = new BackgroundCheckIdentityClient();
    await client.createBackgroundCheck({
      organizationId: 'org_1',
      memberId: 'mem_1',
      employeeName: 'Ada Lovelace',
      employeeEmail: 'ada@example.com',
      requesterEmail: 'admin@example.com',
      attempt: 0,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://glad-sturgeon-729.convex.site/v1/background-checks',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer bc_test',
          'Idempotency-Key': 'comp-background-check:mem_1',
        }),
      }),
    );
    const request = fetchSpy.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as {
      candidate: { name: string; email: string };
      metadata: { compOrganizationId: string; compMemberId: string };
      callbackUrl: string;
      requesterNotes?: string;
    };
    expect(body.candidate).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(body.metadata).toEqual({
      source: 'comp',
      compOrganizationId: 'org_1',
      compMemberId: 'mem_1',
    });
    expect(body.callbackUrl).toBe(
      'https://api.trycomp.ai/v1/background-checks/webhook',
    );
    expect(body.requesterNotes).toBeUndefined();
  });

  it('uses BACKGROUND_WH_ENDPOINT as the Identity callback URL when configured', async () => {
    process.env.BACKGROUND_WH_ENDPOINT =
      'https://delbert-unhopeful-misti.ngrok-free.dev/v1/background-checks/webhook/';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'check_1',
          status: 'invited',
          candidateUrl: 'https://identity.trycomp.ai/cand_1',
        }),
        { status: 200 },
      ),
    );

    const client = new BackgroundCheckIdentityClient();
    await client.createBackgroundCheck({
      organizationId: 'org_1',
      memberId: 'mem_1',
      employeeName: 'Ada Lovelace',
      employeeEmail: 'ada@example.com',
      requesterEmail: 'admin@example.com',
      attempt: 0,
    });

    const request = fetchSpy.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as { callbackUrl: string };
    expect(body.callbackUrl).toBe(
      'https://delbert-unhopeful-misti.ngrok-free.dev/v1/background-checks/webhook',
    );
  });

  it('reports non-json Identity failures without throwing a parse error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('No matching routes found', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }),
    );

    const client = new BackgroundCheckIdentityClient();

    await expect(
      client.createBackgroundCheck({
        organizationId: 'org_1',
        memberId: 'mem_1',
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@example.com',
        requesterEmail: 'admin@example.com',
        attempt: 0,
      }),
    ).rejects.toThrow('Identity background check request failed.');
  });

  it('returns an existing request without charging or calling Identity', async () => {
    const existing = { id: 'bcr_1', status: 'invited' };
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
      mockedDb.backgroundCheckRequest.findUnique,
    ).mockResolvedValueOnce(
      existing as Awaited<
        ReturnType<typeof db.backgroundCheckRequest.findUnique>
      >,
    );
    const identityClient = { createBackgroundCheck: jest.fn() };
    const paymentService = { charge: jest.fn(), refund: jest.fn() };
    const service = new BackgroundChecksService(
      identityClient as unknown as BackgroundCheckIdentityClient,
      paymentService as unknown as BackgroundCheckPaymentService,
    );

    const result = await service.requestForMember({
      organizationId: 'org_1',
      memberId: 'mem_1',
      employeeName: 'Ada Lovelace',
      employeeEmail: 'ada@example.com',
      requesterEmail: 'admin@example.com',
    });

    expect(result).toBe(existing);
    expect(paymentService.charge).not.toHaveBeenCalled();
    expect(identityClient.createBackgroundCheck).not.toHaveBeenCalled();
  });

  it('refunds the payment and stores failed status when Identity fails', async () => {
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
      mockedDb.backgroundCheckRequest.findUnique,
    ).mockResolvedValueOnce(null);
    mockAsync<Awaited<ReturnType<typeof db.member.findFirst>>>(
      mockedDb.member.findFirst,
    ).mockResolvedValueOnce({
      id: 'mem_1',
      organizationId: 'org_1',
    } as Awaited<ReturnType<typeof db.member.findFirst>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.create>>>(
      mockedDb.backgroundCheckRequest.create,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
      status: 'invited',
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.create>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>>(
      mockedDb.backgroundCheckRequest.update,
    )
      .mockResolvedValueOnce({
        id: 'bcr_1',
        status: 'invited',
      } as Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>)
      .mockResolvedValueOnce({
        id: 'bcr_1',
        status: 'failed',
      } as Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>);

    const identityClient = {
      createBackgroundCheck: jest
        .fn()
        .mockRejectedValue(new Error('identity down')),
    };
    const paymentService = {
      charge: jest.fn().mockResolvedValue({
        paymentIntentId: 'pi_1',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
      }),
      refund: jest.fn().mockResolvedValue('re_1'),
    };
    const service = new BackgroundChecksService(
      identityClient as unknown as BackgroundCheckIdentityClient,
      paymentService as unknown as BackgroundCheckPaymentService,
    );

    await expect(
      service.requestForMember({
        organizationId: 'org_1',
        memberId: 'mem_1',
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@example.com',
        requesterEmail: 'admin@example.com',
      }),
    ).rejects.toThrow('identity down');

    expect(paymentService.refund).toHaveBeenCalledWith({
      organizationId: 'org_1',
      memberId: 'mem_1',
      paymentIntentId: 'pi_1',
    });
    expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          stripeRefundId: 're_1',
        }),
      }),
    );
  });

  it('stores internal requester notes on successful requests', async () => {
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
      mockedDb.backgroundCheckRequest.findUnique,
    ).mockResolvedValueOnce(null);
    mockAsync<Awaited<ReturnType<typeof db.member.findFirst>>>(
      mockedDb.member.findFirst,
    ).mockResolvedValueOnce({
      id: 'mem_1',
      organizationId: 'org_1',
    } as Awaited<ReturnType<typeof db.member.findFirst>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.create>>>(
      mockedDb.backgroundCheckRequest.create,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
      status: 'invited',
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.create>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>>(
      mockedDb.backgroundCheckRequest.update,
    )
      .mockResolvedValueOnce({
        id: 'bcr_1',
        status: 'invited',
      } as Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>)
      .mockResolvedValueOnce({
        id: 'bcr_1',
        status: 'invited',
      } as Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>);

    const identityClient = {
      createBackgroundCheck: jest.fn().mockResolvedValue({
        id: 'check_1',
        status: 'invited',
        candidateUrl: 'https://identity.trycomp.ai/cand_1',
      }),
    };
    const paymentService = {
      charge: jest.fn().mockResolvedValue({
        paymentIntentId: 'pi_1',
        status: 'succeeded',
        amount: 4900,
        currency: 'usd',
      }),
      refund: jest.fn(),
    };
    const service = new BackgroundChecksService(
      identityClient as unknown as BackgroundCheckIdentityClient,
      paymentService as unknown as BackgroundCheckPaymentService,
    );

    await service.requestForMember({
      organizationId: 'org_1',
      memberId: 'mem_1',
      employeeName: 'Ada Lovelace',
      employeeEmail: 'ada@example.com',
      requesterEmail: 'admin@example.com',
      requesterNotes: 'Expedite this check.',
    });

    // Record is created with requester notes before charging
    expect(mockedDb.backgroundCheckRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requesterNotes: 'Expedite this check.',
          status: 'invited',
        }),
      }),
    );
    // Payment info is persisted via update
    expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripePaymentIntentId: 'pi_1',
        }),
      }),
    );
    // Identity result is persisted via update
    expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identityBackgroundCheckId: 'check_1',
          candidateUrl: 'https://identity.trycomp.ai/cand_1',
        }),
      }),
    );
    // Record is created before Identity API is called
    expect(
      invocationOrder(mockedDb.backgroundCheckRequest.create),
    ).toBeLessThan(invocationOrder(identityClient.createBackgroundCheck));
    expect(identityClient.createBackgroundCheck).toHaveBeenCalledWith(
      expect.not.objectContaining({
        requesterNotes: expect.any(String),
      }),
    );
  });

  it('handles concurrent requests by returning existing record on unique constraint', async () => {
    const { Prisma } = jest.requireMock<typeof import('@db')>('@db');
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
      mockedDb.backgroundCheckRequest.findUnique,
    )
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'bcr_1',
        status: 'invited',
      } as Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>);
    mockAsync<Awaited<ReturnType<typeof db.member.findFirst>>>(
      mockedDb.member.findFirst,
    ).mockResolvedValueOnce({
      id: 'mem_1',
      organizationId: 'org_1',
    } as Awaited<ReturnType<typeof db.member.findFirst>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.create>>>(
      mockedDb.backgroundCheckRequest.create,
    ).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const paymentService = { charge: jest.fn(), refund: jest.fn() };
    const identityClient = { createBackgroundCheck: jest.fn() };
    const service = new BackgroundChecksService(
      identityClient as unknown as BackgroundCheckIdentityClient,
      paymentService as unknown as BackgroundCheckPaymentService,
    );

    const result = await service.requestForMember({
      organizationId: 'org_1',
      memberId: 'mem_1',
      employeeName: 'Ada Lovelace',
      employeeEmail: 'ada@example.com',
      requesterEmail: 'admin@example.com',
    });

    expect(result).toEqual(expect.objectContaining({ id: 'bcr_1' }));
    expect(paymentService.charge).not.toHaveBeenCalled();
    expect(identityClient.createBackgroundCheck).not.toHaveBeenCalled();
  });

  it('uses BETTER_AUTH_URL as the local app URL fallback for setup redirects', async () => {
    process.env.NEXT_PUBLIC_APP_URL = '';
    process.env.APP_URL = '';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
    const billingService = {
      createSetupSession: jest.fn().mockResolvedValue({
        url: 'https://checkout.stripe.com/c/session_1',
      }),
    } as unknown as BillingService;
    const service = new BackgroundCheckBillingService(billingService);

    await expect(
      service.createSetupSession({
        organizationId: 'org_1',
        successUrl:
          'http://localhost:3000/org_1/people/mem_1?background_check_billing=success',
        cancelUrl: 'http://localhost:3000/org_1/people/mem_1',
        customerEmail: 'billing@trycomp.ai',
      }),
    ).resolves.toEqual({ url: 'https://checkout.stripe.com/c/session_1' });

    expect(billingService.createSetupSession).toHaveBeenCalledWith({
      organizationId: 'org_1',
      successUrl:
        'http://localhost:3000/org_1/people/mem_1?background_check_billing=success',
      cancelUrl: 'http://localhost:3000/org_1/people/mem_1',
      customerEmail: 'billing@trycomp.ai',
    });
  });

  describe('cancelForMember', () => {
    function makeService() {
      const identityClient = { createBackgroundCheck: jest.fn() };
      const paymentService = { charge: jest.fn(), refund: jest.fn() };
      const service = new BackgroundChecksService(
        identityClient as unknown as BackgroundCheckIdentityClient,
        paymentService as unknown as BackgroundCheckPaymentService,
      );
      return { service, identityClient, paymentService };
    }

    it('sets status to cancelled for an in_progress check', async () => {
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
        mockedDb.backgroundCheckRequest.findUnique,
      ).mockResolvedValueOnce({ id: 'bcr_1', status: 'in_progress' } as Awaited<
        ReturnType<typeof db.backgroundCheckRequest.findUnique>
      >);
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>>(
        mockedDb.backgroundCheckRequest.update,
      ).mockResolvedValueOnce({ id: 'bcr_1', status: 'cancelled' } as Awaited<
        ReturnType<typeof db.backgroundCheckRequest.update>
      >);

      const { service } = makeService();
      const result = await service.cancelForMember({ organizationId: 'org_1', memberId: 'mem_1' });

      expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }),
      );
      expect((result as { status: string }).status).toBe('cancelled');
    });

    it('rejects cancelling a completed check', async () => {
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
        mockedDb.backgroundCheckRequest.findUnique,
      ).mockResolvedValueOnce({ id: 'bcr_1', status: 'completed' } as Awaited<
        ReturnType<typeof db.backgroundCheckRequest.findUnique>
      >);
      const { service } = makeService();
      await expect(
        service.cancelForMember({ organizationId: 'org_1', memberId: 'mem_1' }),
      ).rejects.toThrow("Cannot cancel a background check in 'completed' status.");
      expect(mockedDb.backgroundCheckRequest.update).not.toHaveBeenCalled();
    });

    it('throws when no check exists', async () => {
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
        mockedDb.backgroundCheckRequest.findUnique,
      ).mockResolvedValueOnce(null as Awaited<
        ReturnType<typeof db.backgroundCheckRequest.findUnique>
      >);
      const { service } = makeService();
      await expect(
        service.cancelForMember({ organizationId: 'org_1', memberId: 'mem_1' }),
      ).rejects.toThrow('Background check not found.');
    });
  });

  describe('retryForMember', () => {
    it('resubmits a failed check for free with an incremented attempt key', async () => {
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
        mockedDb.backgroundCheckRequest.findUnique,
      ).mockResolvedValueOnce({
        id: 'bcr_1',
        status: 'failed',
        rerunCount: 1,
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@example.com',
      } as Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>);
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>>(
        mockedDb.backgroundCheckRequest.update,
      ).mockResolvedValueOnce({ id: 'bcr_1', status: 'invited' } as Awaited<
        ReturnType<typeof db.backgroundCheckRequest.update>
      >);

      const identityClient = {
        createBackgroundCheck: jest
          .fn()
          .mockResolvedValue({ id: 'check_new', status: 'invited', candidateUrl: 'https://c/x' }),
      };
      const paymentService = { charge: jest.fn(), refund: jest.fn() };
      const service = new BackgroundChecksService(
        identityClient as unknown as BackgroundCheckIdentityClient,
        paymentService as unknown as BackgroundCheckPaymentService,
      );

      await service.retryForMember({
        organizationId: 'org_1',
        memberId: 'mem_1',
        requesterEmail: 'admin@example.com',
      });

      expect(paymentService.charge).not.toHaveBeenCalled();
      expect(identityClient.createBackgroundCheck).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: 'mem_1', attempt: 2 }),
      );
      expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identityBackgroundCheckId: 'check_new',
            status: 'invited',
            rerunCount: 2,
            identityStatus: null,
            reportSnapshot: Prisma.JsonNull,
            reportSyncedAt: null,
          }),
        }),
      );
    });

    it('rejects retrying an in_progress check', async () => {
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
        mockedDb.backgroundCheckRequest.findUnique,
      ).mockResolvedValueOnce({ id: 'bcr_1', status: 'in_progress', rerunCount: 0 } as Awaited<
        ReturnType<typeof db.backgroundCheckRequest.findUnique>
      >);
      const identityClient = { createBackgroundCheck: jest.fn() };
      const service = new BackgroundChecksService(
        identityClient as unknown as BackgroundCheckIdentityClient,
        {} as unknown as BackgroundCheckPaymentService,
      );
      await expect(
        service.retryForMember({ organizationId: 'org_1', memberId: 'mem_1', requesterEmail: 'a@b.c' }),
      ).rejects.toThrow("Cannot retry a background check in 'in_progress' status.");
      expect(identityClient.createBackgroundCheck).not.toHaveBeenCalled();
    });

    it('marks the check failed and rethrows when Identity errors', async () => {
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
        mockedDb.backgroundCheckRequest.findUnique,
      ).mockResolvedValueOnce({
        id: 'bcr_1',
        status: 'cancelled',
        rerunCount: 0,
        employeeName: 'Ada',
        employeeEmail: 'ada@example.com',
      } as Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>);
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>>(
        mockedDb.backgroundCheckRequest.update,
      ).mockResolvedValue({} as Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>);
      const identityClient = {
        createBackgroundCheck: jest.fn().mockRejectedValue(new Error('identity down')),
      };
      const service = new BackgroundChecksService(
        identityClient as unknown as BackgroundCheckIdentityClient,
        { charge: jest.fn(), refund: jest.fn() } as unknown as BackgroundCheckPaymentService,
      );

      await expect(
        service.retryForMember({ organizationId: 'org_1', memberId: 'mem_1', requesterEmail: 'a@b.c' }),
      ).rejects.toThrow('identity down');
      expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
      );
    });

    it('throws when no check exists', async () => {
      mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
        mockedDb.backgroundCheckRequest.findUnique,
      ).mockResolvedValueOnce(null as Awaited<
        ReturnType<typeof db.backgroundCheckRequest.findUnique>
      >);
      const identityClient = { createBackgroundCheck: jest.fn() };
      const service = new BackgroundChecksService(
        identityClient as unknown as BackgroundCheckIdentityClient,
        {} as unknown as BackgroundCheckPaymentService,
      );
      await expect(
        service.retryForMember({ organizationId: 'org_1', memberId: 'mem_1', requesterEmail: 'a@b.c' }),
      ).rejects.toThrow('Background check not found.');
      expect(identityClient.createBackgroundCheck).not.toHaveBeenCalled();
    });
  });

  it('includes background check and penetration test usage in billing status', async () => {
    const billingService = {
      getStatus: jest.fn().mockResolvedValue({
        hasBilling: true,
        hasPaymentMethod: true,
        setupAt: new Date('2026-04-29T12:00:00.000Z'),
        usage: { backgroundChecks: 4, penetrationTests: 2 },
        subscriptions: [],
        invoices: [
          {
            id: 'in_1',
            number: 'INV-001',
            createdAt: '2026-04-30T00:00:00.000Z',
            dueDate: null,
            amountPaid: 4900,
            amountDue: 4900,
            currency: 'usd',
            status: 'paid',
            type: 'One Time',
            hostedInvoiceUrl: 'https://invoice.stripe.com/i/in_1',
            invoicePdfUrl: 'https://invoice.stripe.com/i/in_1.pdf',
          },
        ],
      }),
    } as unknown as BillingService;
    const service = new BackgroundCheckBillingService(billingService);

    await expect(service.getStatus('org_1')).resolves.toMatchObject({
      hasBilling: true,
      hasPaymentMethod: true,
      usage: {
        backgroundChecks: 4,
        penetrationTests: 2,
      },
      invoices: [
        {
          id: 'in_1',
          number: 'INV-001',
          amountPaid: 4900,
          status: 'paid',
          type: 'One Time',
        },
      ],
    });
    expect(billingService.getStatus).toHaveBeenCalledWith('org_1');
  });
});
