import { db, Prisma } from '@db';
import type { StripeService } from '../stripe/stripe.service';
import { findOrCreateBackgroundCheckBillingCustomer } from './background-check-billing-customer';

jest.mock('@db', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message: string, options: { code: string }) {
      super(message);
      this.code = options.code;
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError,
    },
    db: {
      organizationBilling: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
    },
  };
});

const mockedDb = db as jest.Mocked<typeof db>;

describe('findOrCreateBackgroundCheckBillingCustomer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recovers when a concurrent request creates the billing row first', async () => {
    type OrganizationBilling = typeof db.organizationBilling;
    type Organization = typeof db.organization;
    const dbMocks = mockedDb as unknown as {
      organizationBilling: {
        findUnique: jest.MockedFunction<OrganizationBilling['findUnique']>;
        create: jest.MockedFunction<OrganizationBilling['create']>;
      };
      organization: {
        findUnique: jest.MockedFunction<Organization['findUnique']>;
      };
    };

    dbMocks.organizationBilling.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        stripeCustomerId: 'cus_winner',
      } as Awaited<ReturnType<typeof db.organizationBilling.findUnique>>);
    dbMocks.organization.findUnique.mockResolvedValueOnce({
      name: 'Acme',
    } as Awaited<ReturnType<typeof db.organization.findUnique>>);
    dbMocks.organizationBilling.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const customersCreate = jest.fn().mockResolvedValue({ id: 'cus_loser' });
    const customersUpdate = jest.fn().mockResolvedValue({ id: 'cus_winner' });
    const stripeService = {
      getClient: () => ({
        customers: {
          create: customersCreate,
          update: customersUpdate,
        },
      }),
    } as unknown as StripeService;

    await expect(
      findOrCreateBackgroundCheckBillingCustomer({
        stripeService,
        organizationId: 'org_1',
        customerEmail: 'billing@trycomp.ai',
      }),
    ).resolves.toBe('cus_winner');

    expect(customersCreate).toHaveBeenCalledWith(
      {
        name: 'Acme',
        metadata: { organizationId: 'org_1' },
      },
      { idempotencyKey: 'background-check-customer:org_1' },
    );
    expect(customersUpdate).toHaveBeenCalledWith('cus_winner', {
      email: 'billing@trycomp.ai',
    });
  });
});
