import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { VersionDetailClient } from './VersionDetailClient';

export async function generateMetadata() {
  return { title: 'Framework Version' };
}

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string; versionId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId, versionId } = await params;

  return <VersionDetailClient frameworkId={frameworkId} versionId={versionId} />;
}
