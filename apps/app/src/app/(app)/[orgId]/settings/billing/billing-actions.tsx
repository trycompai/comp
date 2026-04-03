'use client';

import { api } from '@/lib/api-client';
import { Button } from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface BillingActionsProps {
  orgId: string;
  action: 'subscribe' | 'portal';
}

export function BillingActions({ orgId, action }: BillingActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const billingUrl = `${window.location.origin}/${orgId}/settings/billing`;

      if (action === 'subscribe') {
        const res = await api.post<{ url: string }>(
          '/v1/pentest-billing/subscribe',
          {
            successUrl: `${billingUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: billingUrl,
          },
          orgId,
        );
        if (res.data?.url) {
          window.location.href = res.data.url;
          return;
        }
        throw new Error(res.error ?? 'Failed to create checkout session');
      }

      if (action === 'portal') {
        const res = await api.post<{ url: string }>(
          '/v1/pentest-billing/portal',
          { returnUrl: billingUrl },
          orgId,
        );
        if (res.data?.url) {
          window.location.href = res.data.url;
          return;
        }
        throw new Error(res.error ?? 'Failed to create portal session');
      }
    } catch (error) {
      console.error('Billing action failed:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={action === 'subscribe' ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={isLoading}
      loading={isLoading}
    >
      {action === 'subscribe'
        ? 'Subscribe — $99/month (3 runs included)'
        : 'Manage payment method'}
    </Button>
  );
}
