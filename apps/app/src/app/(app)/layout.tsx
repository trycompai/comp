import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const session = await auth.api.getSession({
    headers: hdrs,
  });

  if (!session) {
    return redirect('/auth');
  }

  const pendingInvite = await db.invitation.findFirst({
    where: {
      email: session.user.email,
      status: 'pending',
    },
  });

  if (pendingInvite) {
    let path = hdrs.get('x-pathname') || hdrs.get('referer') || '';
    // normalize potential locale prefix
    path = path.replace(/\/([a-z]{2})\//, '/');
    const target = `/invite/${pendingInvite.id}`;
    if (!path.startsWith(target)) {
      return redirect(target);
    }
  }

  const { activeOrganizationId } = session.session;
  const { id: userId } = session.user;

  if (activeOrganizationId) {
    const currentUserMember = await db.member.findFirst({
      where: {
        organizationId: activeOrganizationId,
        userId: userId,
      },
      select: {
        role: true,
      },
    });

    const isAuthorized =
      currentUserMember &&
      (currentUserMember.role.includes('admin') || currentUserMember.role.includes('owner'));

    if (!isAuthorized) {
      const currentPath = hdrs.get('x-pathname') || '';

      if (currentPath !== '/no-access') {
        return redirect('/no-access');
      }
    }
  }

  return <>{children}</>;
}
