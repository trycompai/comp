import { db } from '@db';
import type { Metadata } from 'next';
import { PortalSettings } from './portal-settings';

export default async function PortalSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const organization = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      deviceAgentStepEnabled: true,
      securityTrainingStepEnabled: true,
    },
  });

  return (
    <PortalSettings
      deviceAgentStepEnabled={organization?.deviceAgentStepEnabled ?? true}
      securityTrainingStepEnabled={organization?.securityTrainingStepEnabled ?? true}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Portal Settings',
  };
}
