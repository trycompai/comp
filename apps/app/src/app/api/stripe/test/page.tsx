import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { CheckoutForm } from './checkout-form';

export default async function Page() {
  // Get the current session to determine organizationId
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return <div>No active organization selected</div>;
  }

  const organizationId = session.session.activeOrganizationId;

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Stripe Checkout Test</h1>
      <p className="mb-4">Organization ID: {organizationId}</p>

      <CheckoutForm organizationId={organizationId} />
    </div>
  );
}
