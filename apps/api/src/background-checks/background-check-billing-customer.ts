import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
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
  const stripe = stripeService.getClient();

  if (existingBilling) {
    if (customerEmail) {
      await stripe.customers.update(existingBilling.stripeCustomerId, {
        email: customerEmail,
      });
    }

    return existingBilling.stripeCustomerId;
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!organization) {
    throw new NotFoundException('Organization not found.');
  }

  const customer = await stripe.customers.create({
    name: organization.name,
    ...(customerEmail ? { email: customerEmail } : {}),
    metadata: { organizationId },
  });

  await db.organizationBilling.create({
    data: {
      organizationId,
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}
