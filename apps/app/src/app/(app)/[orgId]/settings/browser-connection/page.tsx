import { serverApi } from '@/lib/api-server';
import { requireRoutePermission } from '@/lib/permissions.server';
import type { Metadata } from 'next';
import { BrowserConnectionClient } from './components/BrowserConnectionClient';
import type { Connection } from './components/connection-format';

export const metadata: Metadata = {
  title: 'Connections',
};

export default async function BrowserConnectionPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireRoutePermission('settings/browser-connection', orgId);

  const res = await serverApi.get<Connection[]>('/v1/browserbase/profiles');
  const initialProfiles = Array.isArray(res.data) ? res.data : [];

  return <BrowserConnectionClient organizationId={orgId} initialProfiles={initialProfiles} />;
}
