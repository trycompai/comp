import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect(`/${orgId}/frameworks`);
  }

  return <>{children}</>;
}
