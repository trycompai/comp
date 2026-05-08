import { db } from '@db';
import { findOrCreateBillingCustomer } from './billing-customer';

jest.mock('@db', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
  db: {
    organization: { findUniqueOrThrow: jest.fn() },
    organizationBilling: { create: jest.fn(), findUnique: jest.fn() },
  },
}));

const mockedDb = db as unknown as {
  organization: { findUniqueOrThrow: jest.Mock };
  organizationBilling: { create: jest.Mock; findUnique: jest.Mock };
};

describe('findOrCreateBillingCustomer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.organizationBilling.findUnique.mockResolvedValue(null);
    mockedDb.organization.findUniqueOrThrow.mockResolvedValue({
      id: 'org_1',
      name: 'Acme',
    });
    mockedDb.organizationBilling.create.mockResolvedValue({});
  });

  it('keeps customer creation idempotent when caller email varies', async () => {
    const customersCreate = jest.fn().mockResolvedValue({ id: 'cus_1' });
    const customersUpdate = jest.fn().mockResolvedValue({ id: 'cus_1' });

    await expect(
      findOrCreateBillingCustomer({
        stripeService: {
          getClient: () => ({
            customers: { create: customersCreate, update: customersUpdate },
          }),
        } as never,
        organizationId: 'org_1',
        customerEmail: 'billing@example.com',
      }),
    ).resolves.toBe('cus_1');

    expect(customersCreate).toHaveBeenCalledWith(
      {
        name: 'Acme',
        metadata: { organizationId: 'org_1' },
      },
      { idempotencyKey: 'organization-billing-customer:org_1' },
    );
    expect(customersUpdate).toHaveBeenCalledWith('cus_1', {
      email: 'billing@example.com',
    });
  });
});
