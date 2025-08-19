import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AcceptInvite } from '../../setup/components/accept-invite';
import { InviteNotMatchCard } from './components/InviteNotMatchCard';
import { InviteStatusCard } from './components/InviteStatusCard';
import { maskEmail } from './utils';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect(`/auth?inviteCode=${code}`);
  }

  const invitation = await db.invitation.findFirst({
    where: {
      id: code,
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
    return (
      <OnboardingLayout variant="setup" currentOrganization={null}>
        <div className="flex min-h-[calc(100dvh-80px)] w-full items-center justify-center p-4">
          <InviteStatusCard
            title="Invite not found"
            description="This invitation code does not exist. Please check the link or ask your admin to resend the invite."
            primaryHref="/"
            primaryLabel="Go home"
          />
        </div>
      </OnboardingLayout>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <OnboardingLayout variant="setup" currentOrganization={null}>
        <div className="flex min-h-[calc(100dvh-80px)] w-full items-center justify-center p-4">
          <InviteStatusCard
            title={invitation.status === 'accepted' ? 'Invite already accepted' : 'Invite expired'}
            description={
              invitation.status === 'accepted'
                ? 'This invitation has already been accepted. If you believe this is a mistake, contact your organization admin.'
                : 'This invitation has expired. Please ask your organization admin to send a new invite.'
            }
            primaryHref="/"
            primaryLabel="Go home"
          />
        </div>
      </OnboardingLayout>
    );
  }

  if (invitation.email !== session.user.email) {
    return (
      <OnboardingLayout variant="setup" currentOrganization={null}>
        <div className="flex min-h-[calc(100dvh-80px)] w-full items-center justify-center p-4">
          <InviteNotMatchCard
            currentEmail={session.user.email}
            invitedEmail={maskEmail(invitation.email)}
          />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout variant="setup" currentOrganization={null}>
      <div className="flex min-h-[calc(100dvh-80px)] w-full items-center justify-center p-4">
        <AcceptInvite
          inviteCode={invitation.id}
          organizationName={invitation.organization.name || ''}
        />
      </div>
    </OnboardingLayout>
  );
}
