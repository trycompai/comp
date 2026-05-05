import { HttpStatus, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { AdminBillingActionsService } from './admin-billing-actions.service';

jest.mock('@db', () => ({
  db: {
    organization: { findUnique: jest.fn() },
    organizationBilling: { findUnique: jest.fn() },
    organizationBillingSubscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    billingAuditEvent: { create: jest.fn() },
  },
}));

const mockedDb = db as unknown as {
  organization: { findUnique: jest.Mock };
  organizationBilling: { findUnique: jest.Mock };
  organizationBillingSubscription: { findMany: jest.Mock };
};

describe('AdminBillingActionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.organization.findUnique.mockResolvedValue({
      id: 'org_1',
      name: 'Customer',
    });
    mockedDb.organizationBilling.findUnique.mockResolvedValue({
      organizationId: 'org_1',
      stripeCustomerId: 'cus_org_1',
    });
    mockedDb.organizationBillingSubscription.findMany.mockResolvedValue([]);
  });

  it('rejects invoice recovery links for invoices owned by another customer', async () => {
    const service = new AdminBillingActionsService(
      {
        getClient: () => ({
          invoices: {
            retrieve: jest.fn().mockResolvedValue({
              id: 'in_other',
              customer: 'cus_other',
              status: 'open',
            }),
          },
        }),
        isConfigured: () => true,
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.getInvoiceRetryLink({
        organizationId: 'org_1',
        adminUserId: 'usr_admin',
        invoiceId: 'in_other',
        note: 'customer asked',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invoice recovery links when Stripe billing is not configured', async () => {
    const getClient = jest.fn();
    const service = new AdminBillingActionsService(
      {
        getClient,
        isConfigured: () => false,
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.getInvoiceRetryLink({
        organizationId: 'org_1',
        adminUserId: 'usr_admin',
        invoiceId: 'in_open',
        note: 'retry payment',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.PAYMENT_REQUIRED,
    });
    expect(getClient).not.toHaveBeenCalled();
  });
});
