import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const CLOUD_PROVIDER_SLUGS = ['aws', 'gcp', 'azure'];

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const orgId = session?.session.activeOrganizationId;

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    }));

    return NextResponse.json([...newProviders, ...legacyProviders]);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}
