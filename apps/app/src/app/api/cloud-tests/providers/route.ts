import { CLOUD_PROVIDER_CATEGORY } from '@/app/(app)/[orgId]/cloud-tests/constants';
import { auth } from '@/utils/auth';
import { getManifest } from '@comp/integration-platform';
import { db } from '@db';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
          category: CLOUD_PROVIDER_CATEGORY,
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
      },
    });

    // Filter legacy integrations to only include cloud providers
    // NOTE: We now allow BOTH legacy and new connections to coexist for the same provider
    // This supports organizations migrating gradually (e.g., adding new AWS accounts while keeping old ones)
    const activeLegacyIntegrations = legacyIntegrations.filter((integration) => {
      const manifest = getManifest(integration.integrationId);
      return manifest?.category === CLOUD_PROVIDER_CATEGORY;
    });

    // Map new connections
    const newProviders = newConnections.map((conn) => {
      const metadata = (conn.metadata || {}) as Record<string, unknown>;
      const displayName =
        typeof metadata.connectionName === 'string' ? metadata.connectionName : conn.provider.name;
      const accountId = typeof metadata.accountId === 'string' ? metadata.accountId : undefined;
      const regions = Array.isArray(metadata.regions)
        ? metadata.regions.filter((region): region is string => typeof region === 'string')
        : undefined;
      const manifest = getManifest(conn.provider.slug);

      return {
        id: conn.id,
        integrationId: conn.provider.slug,
        name: conn.provider.name,
        displayName,
        organizationId: conn.organizationId,
        lastRunAt: conn.lastSyncAt,
        status: conn.status,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
        isLegacy: false,
        variables: conn.variables,
        requiredVariables: getRequiredVariables(conn.provider.slug),
        accountId,
        regions,
        supportsMultipleConnections: manifest?.supportsMultipleConnections ?? false,
      };
    });

    // Map legacy integrations
    const legacyProviders = activeLegacyIntegrations.map((integration) => {
      const settings = (integration.settings || {}) as Record<string, unknown>;
      const displayName =
        typeof settings.connectionName === 'string' ? settings.connectionName : integration.name;
      const accountId = typeof settings.accountId === 'string' ? settings.accountId : undefined;
      const regions = Array.isArray(settings.regions)
        ? settings.regions.filter((region): region is string => typeof region === 'string')
        : undefined;
      const manifest = getManifest(integration.integrationId);

      return {
        id: integration.id,
        integrationId: integration.integrationId,
        name: integration.name,
        displayName,
        organizationId: integration.organizationId,
        lastRunAt: integration.lastRunAt,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        isLegacy: true,
        variables: null,
        requiredVariables: getRequiredVariables(integration.integrationId),
        accountId,
        regions,
        supportsMultipleConnections: manifest?.supportsMultipleConnections ?? false,
      };
    });

    return NextResponse.json([...newProviders, ...legacyProviders]);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}
