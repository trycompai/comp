import { auth } from '@/utils/auth';
import { getManifest } from '@comp/integration-platform';
import { db } from '@db';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const CLOUD_PROVIDER_SLUGS = ['aws', 'gcp', 'azure'];

// Get required variables from manifest
const getRequiredVariables = (providerSlug: string): string[] => {
  const manifest = getManifest(providerSlug);
  if (!manifest?.checks) return [];

  const requiredVars = new Set<string>();
  for (const check of manifest.checks) {
    if (check.variables) {
      for (const variable of check.variables) {
        if (variable.required) {
          requiredVars.add(variable.id);
        }
      }
    }
  }
  return Array.from(requiredVars);
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify the user belongs to the requested organization
    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: orgId,
        deactivated: false,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch from NEW integration platform (IntegrationConnection)
    const newConnections = await db.integrationConnection.findMany({
      where: {
        organizationId: orgId,
        status: 'active',
        provider: {
          slug: {
            in: CLOUD_PROVIDER_SLUGS,
          },
        },
      },
      include: {
        provider: true,
      },
    });

    // Fetch from OLD integration table (Integration) - for backward compat
    const legacyIntegrations = await db.integration.findMany({
      where: {
        organizationId: orgId,
        integrationId: {
          in: CLOUD_PROVIDER_SLUGS,
        },
      },
    });

    // Filter out legacy integrations that have been migrated to new platform
    const newConnectionSlugs = new Set(newConnections.map((c) => c.provider.slug));
    const activeLegacyIntegrations = legacyIntegrations.filter(
      (i) => !newConnectionSlugs.has(i.integrationId),
    );

    // Map new connections
    const newProviders = newConnections.map((conn) => ({
      id: conn.id,
      integrationId: conn.provider.slug,
      name: conn.provider.name,
      organizationId: conn.organizationId,
      lastRunAt: conn.lastSyncAt,
      status: conn.status,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      isLegacy: false,
      variables: conn.variables,
      requiredVariables: getRequiredVariables(conn.provider.slug),
    }));

    // Map legacy integrations
    const legacyProviders = activeLegacyIntegrations.map((integration) => ({
      id: integration.id,
      integrationId: integration.integrationId,
      name: integration.name,
      organizationId: integration.organizationId,
      lastRunAt: integration.lastRunAt,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      isLegacy: true,
      variables: null,
      requiredVariables: getRequiredVariables(integration.integrationId),
    }));

    return NextResponse.json([...newProviders, ...legacyProviders]);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}
