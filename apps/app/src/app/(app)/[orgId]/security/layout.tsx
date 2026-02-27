import { getFeatureFlags } from '@/app/posthog';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

export default async function SecurityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: _orgId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return notFound();
  }

  const flags = await getFeatureFlags(session.user.id);
  const isSecurityEnabled =
    flags['is-security-enabled'] === true || flags['is-security-enabled'] === 'true';

  if (!isSecurityEnabled) {
    return notFound();
  }

  void _orgId;

  return <>{children}</>;
}
