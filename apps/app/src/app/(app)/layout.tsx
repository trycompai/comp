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

  return <>{children}</>;
}
