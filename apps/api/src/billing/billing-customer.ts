import { Prisma, db } from '@db';
import type { StripeService } from '../stripe/stripe.service';

export async function findOrCreateBillingCustomer(params: {
  stripeService: StripeService;
  organizationId: string;
  customerEmail?: string;
}): Promise<string> {
  const existing = await db.organizationBilling.findUnique({
    where: { organizationId: params.organizationId },
    select: { stripeCustomerId: true },
  });
  if (existing) {
    return existing.stripeCustomerId;
  }

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: params.organizationId },
    select: { id: true, name: true },
  });
  const stripe = params.stripeService.getClient();
  const customer = await stripe.customers.create(
    {
      name: organization.name,
      email: params.customerEmail,
      metadata: { organizationId: organization.id },
    },
    {
      idempotencyKey: ['organization-billing-customer', organization.id].join(
        ':',
      ),
    },
  );

  try {
    await db.organizationBilling.create({
      data: {
        organizationId: organization.id,
        stripeCustomerId: customer.id,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await db.organizationBilling.findUniqueOrThrow({
      where: { organizationId: organization.id },
      select: { stripeCustomerId: true },
    });
    return raced.stripeCustomerId;
  }

  return customer.id;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
