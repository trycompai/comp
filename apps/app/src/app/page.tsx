import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect('/auth');
  }

  const orgId = session.session.activeOrganizationId;

  if (!orgId) {
    return redirect('/setup');
  }

  const member = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
    },
  });

  if (member?.role === 'employee') {
    return redirect('/no-access');
  }

  if (!member) {
    return redirect('/setup');
  }

  return redirect(`/${orgId}/frameworks`);
}
