'use client';

import { completeInvitation } from '@/actions/organization/accept-invitation';
import { authClient } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';

export function AcceptInvite({
  inviteCode,
  organizationName,
}: {
  inviteCode: string;
  organizationName: string;
}) {
  // Using next/navigation redirect to avoid showing invite page after accept

  const { execute, isPending } = useAction(completeInvitation, {
    onSuccess: async (result) => {
      if (result.data?.data?.organizationId) {
        // Set the active organization before redirecting
        await authClient.organization.setActive({
          organizationId: result.data.data.organizationId,
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to accept invitation');
    },
  });

  const handleAccept = async () => {
    await execute({ inviteCode });
    redirect(`/`);
  };

  return (
    <div className="bg-card relative w-full max-w-[440px] rounded-sm border p-8 shadow-lg">
      <div className="mb-8 flex justify-center">
        <Link href="/">
          <Icons.Logo />
        </Link>
      </div>

      <div className="mb-8 space-y-1.5 text-center">
        <h1 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          You have been invited to join
        </h1>
        <p className="text-2xl font-semibold tracking-tight line-clamp-1">
          {organizationName || 'an organization'}
        </p>
        <p className="text-muted-foreground text-sm">
          Please accept the invitation to join the organization.
        </p>
      </div>

      <Button onClick={handleAccept} className="w-full" size="sm" disabled={isPending}>
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
