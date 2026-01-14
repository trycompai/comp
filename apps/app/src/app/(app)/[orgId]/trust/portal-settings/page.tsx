import { redirect } from 'next/navigation';

export default async function PortalSettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/${orgId}/trust`);
}
