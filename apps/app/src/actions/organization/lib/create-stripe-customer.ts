import { stripe } from './stripe';

async function createStripeCustomer(input: {
  name: string;
  email: string;
  organizationId: string;
}): Promise<string> {
  try {
    if (!stripe) {
      return 'test_customer_id';
    }

    const customer = await stripe.customers.create({
      name: input.name,
      email: input.email,
      metadata: {
        organizationId: input.organizationId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer', error);
    throw error;
  }
}

export { createStripeCustomer };
