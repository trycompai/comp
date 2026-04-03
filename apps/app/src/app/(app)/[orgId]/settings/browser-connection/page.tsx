import type { Metadata } from 'next';
import { getFeatureFlags } from '@/app/posthog';
import { requireRoutePermission } from '@/lib/permissions.server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { BrowserConnectionClient } from './components/BrowserConnectionClient';

export const metadata: Metadata = {
  title: 'Browser Connection',
};

export default async function BrowserConnectionPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  await requireRoutePermission('settings/browser-connection', orgId);

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return notFound();
  }

  const flags = await getFeatureFlags(session.user.id);
  const isWebAutomationsEnabled =
    flags['is-web-automations-enabled'] === true || flags['is-web-automations-enabled'] === 'true';

  if (!isWebAutomationsEnabled) {
    return notFound();
  }

  return <BrowserConnectionClient organizationId={orgId} />;
}
