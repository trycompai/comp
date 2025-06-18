'use client';

import { completeInvitation } from '@/actions/organization/accept-invitation';
import { authClient } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function AcceptInvite({
  inviteCode,
  organizationName,
}: {
  inviteCode: string;
  organizationName: string;
}) {
  const router = useRouter();

  const { execute, isPending } = useAction(completeInvitation, {
    onSuccess: async (result) => {
      if (result.data?.data?.organizationId) {
        // Set the active organization before redirecting
        await authClient.organization.setActive({
          organizationId: result.data.data.organizationId,
        });
        // Redirect to the organization's root path
        router.push(`/${result.data.data.organizationId}/`);
      }
    },
    onError: (error) => {
      toast.error('Failed to accept invitation');
    },
  });

  const handleAccept = () => {
    execute({ inviteCode });
  };

  return (
    <div className="bg-card relative w-full max-w-[440px] rounded-sm border p-8 shadow-lg">
      <div className="mb-8 flex justify-between">
        <Link href="/">
          <Icons.Logo />
        </Link>
      </div>

      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">You have been invited to join</h1>
        <p className="text-xl font-medium line-clamp-1">{organizationName || 'an organization'}</p>
        <p className="text-muted-foreground text-sm">
          Please accept the invitation to join the organization.
        </p>
      </div>

      <Button onClick={handleAccept} className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Accepting...
          </>
        ) : (
          'Accept Invitation'
        )}
      </Button>
    </div>
  );
}
