import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { VersionsClient } from './VersionsClient';

export async function generateMetadata() {
  return { title: 'Framework Versions' };
}

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  return <VersionsClient frameworkId={frameworkId} />;
}
