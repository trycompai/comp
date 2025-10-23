import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  // Respect explicit intent to create an additional organization
  const hdrs = await headers();
  const intent = hdrs.get('x-intent');

  // If user already belongs to an org, route to their latest org instead of re-running setup
  const session = await auth.api.getSession({ headers: await headers() });
  if (session && intent !== 'create-additional') {
    const userOrg = await db.organization.findFirst({
      where: {
        members: { some: { userId: session.user.id } },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, onboardingCompleted: true },
    });
    if (userOrg) {
      if (userOrg.onboardingCompleted === false) {
        return redirect(`/onboarding/${userOrg.id}`);
      }
      return redirect(`/${userOrg.id}/frameworks`);
    }
  }

  return <>{children}</>;
}
