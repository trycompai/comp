import { getOrganizations } from '@/data/getOrganizations';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import type { Organization } from '@comp/db/types';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AcceptInvite } from '../../setup/components/accept-invite';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Redirect to auth with the invite code
    return redirect(`/auth?inviteCode=${code}`);
  }

  // Fetch existing organizations
  let organizations: Organization[] = [];
  try {
    const result = await getOrganizations();
    organizations = result.organizations;
  } catch (error) {
    // If user has no organizations, continue with empty array
    console.error('Failed to fetch organizations:', error);
  }

  // Check if this invitation exists and is valid for this user
  const invitation = await db.invitation.findFirst({
    where: {
      id: code,
      email: session.user.email,
      status: 'pending',
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    // Either invitation doesn't exist, already accepted, or not for this user
    notFound();
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <AcceptInvite
        inviteCode={invitation.id}
        organizationName={invitation.organization.name || ''}
      />
    </div>
  );
}
