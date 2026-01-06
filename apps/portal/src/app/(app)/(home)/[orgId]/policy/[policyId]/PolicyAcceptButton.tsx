'use client';

import { apiClient } from '@/lib/api-client';
import { Button } from '@trycompai/design-system';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

interface PolicyAcceptButtonProps {
  policyId: string;
  isAccepted: boolean;
  orgId: string;
}

export function PolicyAcceptButton({ policyId, isAccepted, orgId }: PolicyAcceptButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(isAccepted);

  const handleAccept = async () => {
    startTransition(async () => {
      try {
        const result = await apiClient.post<{ success: boolean; error?: string }>(
          `/v1/policies/${policyId}/acknowledge`,
          undefined,
          orgId,
        );

        if (!result.error) {
          setAccepted(true);
          toast.success('Policy accepted successfully');
          router.refresh();
          // Redirect after a short delay to show the success state
          setTimeout(() => {
            router.push(`/${orgId}`);
          }, 1000);
        } else {
          toast.error(result.error || 'Failed to accept policy');
        }
      } catch (error) {
        console.error('Error accepting policy:', error);
        toast.error('An error occurred while accepting the policy');
      }
    });
  };

  if (accepted) {
    return (
      <Button disabled className="w-full">
        <span className="inline-flex items-center gap-2">
          <Check className="h-4 w-4" />
          Policy Accepted
        </span>
      </Button>
    );
  }

  return (
    <Button onClick={handleAccept} disabled={isPending} className="w-full">
      {isPending ? 'Accepting...' : 'Accept Policy'}
    </Button>
  );
}
