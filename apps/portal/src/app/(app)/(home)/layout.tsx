import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect('/auth');

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) return redirect('/unauthorized');

  const [member] = await Promise.all([
    db.member.findFirst({
      where: { userId: session.user.id, organizationId: activeOrgId },
      select: { id: true },
    }),
    db.organization.findUnique({
      where: { id: activeOrgId },
      select: { id: true, onboardingCompleted: true, hasAccess: true },
    }),
  ]);

  if (!member) return redirect('/unauthorized');

  return <div className="mx-auto max-w-3xl">{children}</div>;
}
