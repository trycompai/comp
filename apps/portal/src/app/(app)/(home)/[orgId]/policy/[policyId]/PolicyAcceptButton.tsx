'use client';

import { acceptPolicy } from '@/actions/accept-policies';
import { Button } from '@comp/ui/button';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

interface PolicyAcceptButtonProps {
  policyId: string;
  memberId: string;
  isAccepted: boolean;
  orgId: string;
}

export function PolicyAcceptButton({
  policyId,
  memberId,
  isAccepted,
  orgId,
}: PolicyAcceptButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(isAccepted);

  const handleAccept = async () => {
    startTransition(async () => {
      try {
        const result = await acceptPolicy(policyId, memberId);
        if (result.success) {
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
        <Check className="mr-2 h-4 w-4" />
        Policy Accepted
      </Button>
    );
  }

  return (
    <Button onClick={handleAccept} disabled={isPending} className="w-full">
      {isPending ? 'Accepting...' : 'Accept Policy'}
    </Button>
  );
}
