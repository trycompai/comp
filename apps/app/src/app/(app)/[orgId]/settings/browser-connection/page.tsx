import type { Metadata } from 'next';
import { getFeatureFlags } from '@/app/posthog';
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Browser Connection</h2>
        <p className="text-sm text-muted-foreground">
          Connect a browser session to enable automated screenshots and evidence collection from
          authenticated web pages.
        </p>
      </div>
      <BrowserConnectionClient organizationId={orgId} />
    </div>
  );
}
