import { db } from '@/lib/db';
import { auth as betterAuth } from '@/utils/auth';
import { auth } from '@trigger.dev/sdk';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TestsLayout } from './components/TestsLayout';

export default async function CloudTestsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const session = await betterAuth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    redirect('/');
  }

  if (session.session.activeOrganizationId !== orgId) {
    redirect(`/${session.session.activeOrganizationId}/cloud-tests`);
  }

  // Fetch cloud providers
  const providers =
    (await db.integration.findMany({
      where: {
        organizationId: orgId,
        integrationId: {
          in: ['aws', 'gcp', 'azure'],
        },
      },
    })) || [];

  // Fetch findings
  const findings =
    (await db.integrationResult.findMany({
      where: {
        organizationId: orgId,
        integration: {
          integrationId: {
            in: ['aws', 'gcp', 'azure'],
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        remediation: true,
        status: true,
        severity: true,
        completedAt: true,
        integration: {
          select: {
            integrationId: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })) || [];

  const triggerToken = await auth.createTriggerPublicToken('run-integration-tests', {
    multipleUse: true,
    expirationTime: '1hr',
  });

  return (
    <TestsLayout
      initialFindings={findings}
      initialProviders={providers}
      triggerToken={triggerToken}
      orgId={orgId}
    />
  );
}
