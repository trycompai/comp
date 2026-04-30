import { BackgroundCheckIdentityClient } from './background-check-identity.client';
import { BackgroundCheckBillingService } from './background-check-billing.service';
import { BackgroundCheckPaymentService } from './background-check-payment.service';
import { BackgroundChecksService } from './background-checks.service';
import { db } from '@db';
import type { StripeService } from '../stripe/stripe.service';

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
      failed: 'failed',
      invited: 'invited',
    },
    Prisma: {
      PrismaClientKnownRequestError,
    },
    db: {
      backgroundCheckRequest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
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
    (fn as { mock: { invocationCallOrder: number[] } }).mock.invocationCallOrder[index] ?? 0
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
    expect(body.callbackUrl).toBe('https://api.trycomp.ai/v1/background-checks/webhook');
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
      }),
    ).rejects.toThrow('Identity background check request failed.');
  });

  it('returns an existing request without charging or calling Identity', async () => {
    const existing = { id: 'bcr_1', status: 'invited' };
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
      mockedDb.backgroundCheckRequest.findUnique,
    ).mockResolvedValueOnce(
      existing as Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>,
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
      createBackgroundCheck: jest.fn().mockRejectedValue(new Error('identity down')),
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
    expect(invocationOrder(mockedDb.backgroundCheckRequest.create)).toBeLessThan(
      invocationOrder(identityClient.createBackgroundCheck),
    );
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
    process.env = {
      ...process.env,
      NEXT_PUBLIC_APP_URL: '',
      APP_URL: '',
      BETTER_AUTH_URL: 'http://localhost:3000',
    };
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.findUnique>>>(
      mockedDb.organizationBilling.findUnique,
    ).mockResolvedValueOnce(null);
    mockAsync<Awaited<ReturnType<typeof db.organization.findUnique>>>(
      mockedDb.organization.findUnique,
    ).mockResolvedValueOnce({
      name: 'Acme',
    } as Awaited<ReturnType<typeof db.organization.findUnique>>);
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.create>>>(
      mockedDb.organizationBilling.create,
    ).mockResolvedValueOnce({
      organizationId: 'org_1',
      stripeCustomerId: 'cus_1',
    } as Awaited<ReturnType<typeof db.organizationBilling.create>>);

    const stripe = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            url: 'https://checkout.stripe.com/c/session_1',
          }),
        },
      },
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'cus_1' }),
      },
      prices: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'price_bg',
          unit_amount: 4900,
          currency: 'usd',
        }),
      },
    };
    const stripeService = {
      getClient: () => stripe,
    } as unknown as StripeService;
    const service = new BackgroundCheckBillingService(stripeService);

    await expect(
      service.createSetupSession({
        organizationId: 'org_1',
        successUrl:
          'http://localhost:3000/org_1/people/mem_1?background_check_billing=success',
        cancelUrl: 'http://localhost:3000/org_1/people/mem_1',
      }),
    ).resolves.toEqual({ url: 'https://checkout.stripe.com/c/session_1' });
  });
});
