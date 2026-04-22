import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/utils/auth';
import { VersionsPageClient } from './VersionsPageClient';

export async function generateMetadata() {
  return { title: 'Framework Versions' };
}

export default async function FrameworkVersionsPage({
  params,
}: {
  params: Promise<{ orgId: string; frameworkId: string }>;
}) {
  const { orgId, frameworkId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect(`/${orgId}/overview`);
  }

  return <VersionsPageClient frameworkId={frameworkId} />;
}
