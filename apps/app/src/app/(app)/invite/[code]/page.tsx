import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SignOut } from '@/components/sign-out';
import { auth } from '@/utils/auth';
import { Icons } from '@comp/ui/icons';
import { db } from '@db';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AcceptInvite } from '../../setup/components/accept-invite';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal =
    local.length <= 2 ? `${local[0] ?? ''}***` : `${local[0]}***${local.slice(-1)}`;

  const domainParts = domain.split('.');
  if (domainParts.length === 0) return `${maskedLocal}@***`;
  const tld = domainParts[domainParts.length - 1];
  const secondLevel = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : '';
  const maskedSecondLevel = secondLevel ? `${secondLevel[0]}***` : '***';

  return `${maskedLocal}@${maskedSecondLevel}.${tld}`;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Redirect to auth with the invite code
    return redirect(`/auth?inviteCode=${code}`);
  }

  // Load invite by code, then verify email after
  const invitation = await db.invitation.findFirst({
    where: {
      id: code,
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
    notFound();
  }

  // If signed-in user email doesn't match the invited email, prompt to switch accounts
  if (invitation.email !== session.user.email) {
    return (
      <OnboardingLayout variant="setup" currentOrganization={null}>
        <div className="flex min-h-[calc(100dvh-80px)] w-full items-center justify-center p-4">
          <div className="bg-card relative w-full max-w-[480px] rounded-sm border p-10 shadow-lg">
            <div className="flex flex-col items-center gap-6 text-center">
              <Icons.Logo />
              <h1 className="text-2xl font-semibold tracking-tight">Wrong account</h1>
              <div className="mx-auto max-w-[42ch] text-muted-foreground leading-relaxed flex flex-col gap-4">
                <div className="space-y-2 text-sm">
                  <p>
                    You are signed in as
                    <span className="mx-1 inline-flex items-center rounded-xs border border-muted bg-muted/40 px-2 py-0.5 text-sm">
                      {session.user.email}
                    </span>
                  </p>
                  <p>
                    This invite is for
                    <span className="mx-1 inline-flex items-center rounded-xs border border-muted bg-muted/40 px-2 py-0.5 text-sm">
                      {maskEmail(invitation.email)}
                    </span>
                  </p>
                </div>
                <p className="text-base font-medium">
                  To accept, sign out and sign back in with the invited email.
                </p>
              </div>
              <SignOut asButton className="w-full" />
            </div>
          </div>
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
