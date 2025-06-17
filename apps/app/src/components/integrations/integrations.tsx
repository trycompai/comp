'use client';

import { Integration } from '@comp/db/types';
import { integrations } from '@comp/integrations';
import { Button } from '@comp/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { IntegrationsCard } from './integrations-card';

// Update the type to include lastRunAt and nextRunAt
type ExtendedOrganizationIntegrations = Integration & {
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
};

export function OrganizationIntegration({
  installed,
}: {
  installed: ExtendedOrganizationIntegrations[];
}) {
  const searchParams = useSearchParams();
  const isInstalledPage = searchParams.get('tab') === 'installed';
  const search = searchParams.get('q');
  const router = useRouter();

  // Map installed integrations by their integration_id rather than name
  const installedIntegrations = installed.map((i) => i.integrationId.toLowerCase());

  const installedSettings: Record<string, unknown> = installed.reduce(
    (acc, integration) => {
      acc[integration.integrationId.toLowerCase()] = integration.userSettings;
      return acc;
    },
    {} as Record<string, unknown>,
  );

  const integrationsByCategory = integrations
    .filter((integration) => {
      const shouldInclude = !isInstalledPage || installedIntegrations.includes(integration.id);

      return shouldInclude;
    })
    .filter((integration) => {
      const matchesSearch =
        !search || integration.name.toLowerCase().includes(search.toLowerCase());

      return matchesSearch;
    })
    .reduce(
      (acc, integration) => {
        const category = integration.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(integration);
        return acc;
      },
      {} as Record<string, typeof integrations>,
    );

  if (search && Object.keys(integrationsByCategory).length === 0) {
    return (
      <div className="flex h-[calc(100vh-400px)] flex-col items-center justify-center">
        <h3 className="text-foreground text-lg font-semibold">No integrations found</h3>
        <p className="text-muted-foreground mt-2 max-w-md text-center text-sm">
          No integrations found for your search, let us know if you want to see a specific
          integration.
        </p>

        <Button onClick={() => router.push('/integrations')} className="mt-4" variant="outline">
          Clear search
        </Button>
      </div>
    );
  }

  if (!search && Object.keys(integrationsByCategory).length === 0) {
    return (
      <div className="flex h-[calc(100vh-400px)] flex-col items-center justify-center">
        <h3 className="text-foreground text-lg font-semibold">No integrations installed</h3>
        <p className="text-muted-foreground mt-2 max-w-md text-center text-sm">
          You haven't installed any integrations yet. Go to the 'All Integrations' tab to browse
          available integrations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(integrationsByCategory).map(([category, items]) => (
        <div key={category}>
          <h2 className="mb-4 text-lg font-medium">{category}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((integration) => {
              // Find the installed integration data
              const installedIntegration = installed.find(
                (i) => i.integrationId.toLowerCase() === integration.id,
              );

              // Handle different integration formats
              const integrationProps = {
                id: integration.id,
                logo: integration.logo,
                name: integration.name,
                short_description:
                  'short_description' in integration
                    ? integration.short_description
                    : (integration as any).description || '',
                description: (integration as any).description || '',
                guide_url: (integration as any).guide_url || '',
                settings:
                  'settings' in integration
                    ? (integration as any).settings
                    : 'fields' in integration
                      ? (integration as any).fields
                      : [],
                images: 'images' in integration ? (integration as any).images : [],
                active: 'active' in integration ? (integration as any).active : true,
                installed: installedIntegrations.includes(integration.id),
                category: integration.category,
                installedSettings: installedSettings[integration.id] || {},
                // Pass the last run and next run information
                lastRunAt: installedIntegration?.lastRunAt,
                nextRunAt: installedIntegration?.nextRunAt,
              };

              return <IntegrationsCard key={integration.id} {...integrationProps} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
