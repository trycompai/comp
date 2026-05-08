import { NotFoundException } from '@nestjs/common';
import { db, Prisma } from '@db';
import { StripeService } from '../stripe/stripe.service';

export async function findOrCreateBackgroundCheckBillingCustomer({
  stripeService,
  organizationId,
  customerEmail,
}: {
  stripeService: StripeService;
  organizationId: string;
  customerEmail?: string;
}): Promise<string> {
  const existingBilling = await db.organizationBilling.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  });

  if (existingBilling) {
    await updateStripeCustomerEmail({
      stripeService,
      stripeCustomerId: existingBilling.stripeCustomerId,
      customerEmail,
    });
    return existingBilling.stripeCustomerId;
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!organization) {
    throw new NotFoundException('Organization not found.');
  }

  const stripe = stripeService.getClient();
  const customer = await stripe.customers.create(
    {
      name: organization.name,
      metadata: { organizationId },
    },
    {
      idempotencyKey: `background-check-customer:${organizationId}`,
    },
  );

  try {
    await db.organizationBilling.create({
      data: {
        organizationId,
        stripeCustomerId: customer.id,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const billing = await db.organizationBilling.findUnique({
      where: { organizationId },
      select: { stripeCustomerId: true },
    });

    if (!billing) {
      throw error;
    }

    await updateStripeCustomerEmail({
      stripeService,
      stripeCustomerId: billing.stripeCustomerId,
      customerEmail,
    });

    return billing.stripeCustomerId;
  }

  await updateStripeCustomerEmail({
    stripeService,
    stripeCustomerId: customer.id,
    customerEmail,
  });

  return customer.id;
}

async function updateStripeCustomerEmail({
  stripeService,
  stripeCustomerId,
  customerEmail,
}: {
  stripeService: StripeService;
  stripeCustomerId: string;
  customerEmail?: string;
}): Promise<void> {
  if (!customerEmail) return;

  const stripe = stripeService.getClient();
  await stripe.customers.update(stripeCustomerId, {
    email: customerEmail,
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
