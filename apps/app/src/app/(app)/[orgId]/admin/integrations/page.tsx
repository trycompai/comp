'use client';

import { api } from '@/lib/api-client';
import {
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  PageLayout,
  Stack,
  Text,
} from '@trycompai/design-system';
import {
  InProgress,
  Renew,
} from '@trycompai/design-system/icons';
import { useState } from 'react';
import useSWR from 'swr';
import { IntegrationCard, type Integration } from './components/IntegrationCard';

export default function AdminIntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: integrations,
    error,
    isLoading,
    mutate,
  } = useSWR<Integration[]>('admin-integrations', async () => {
    const response = await api.get<Integration[]>('/v1/admin/integrations');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  });

  const filteredIntegrations = integrations?.filter((i) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      i.name.toLowerCase().includes(query) ||
      i.description.toLowerCase().includes(query) ||
      i.category.toLowerCase().includes(query)
    );
  });

  const oauthIntegrations = filteredIntegrations?.filter((i) => i.authType === 'oauth2') || [];
  const otherIntegrations = filteredIntegrations?.filter((i) => i.authType !== 'oauth2') || [];

  const configuredCount = integrations?.filter((i) => i.hasCredentials).length || 0;
  const oauthPendingCount = integrations?.filter((i) => i.authType === 'oauth2' && !i.hasCredentials).length || 0;

  return (
    <PageLayout
      header={<PageHeader title="Integration Credentials" />}
    >
      <Stack gap="lg">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Integrations" value={integrations?.length || 0} />
          <StatCard label="Configured" value={configuredCount} variant="success" />
          <StatCard label="OAuth Pending Setup" value={oauthPendingCount} variant="warning" />
        </div>

        <div className="flex items-center gap-4">
          <div className="max-w-sm flex-1">
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => mutate()} loading={isLoading} iconLeft={<Renew size={16} />}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 p-4 text-red-500">
            Failed to load integrations: {error.message}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin text-muted-foreground"><InProgress /></div>
          </div>
        )}

        {!isLoading && integrations && (
          <Stack gap="lg">
            {oauthIntegrations.length > 0 && (
              <IntegrationSection
                title={`OAuth Integrations (${oauthIntegrations.length})`}
                integrations={oauthIntegrations}
                onRefresh={() => mutate()}
              />
            )}
            {otherIntegrations.length > 0 && (
              <IntegrationSection
                title={`Other Integrations (${otherIntegrations.length})`}
                integrations={otherIntegrations}
                onRefresh={() => mutate()}
              />
            )}
          </Stack>
        )}
      </Stack>
    </PageLayout>
  );
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: 'success' | 'warning';
}) {
  const colorClass =
    variant === 'success'
      ? 'text-green-600 dark:text-green-400'
      : variant === 'warning'
        ? 'text-yellow-600 dark:text-yellow-400'
        : '';

  return (
    <Card>
      <CardContent>
        <div className={`pt-6 ${colorClass}`}>
          <div className="text-2xl font-bold">{value}</div>
          <Text size="sm" variant="muted">{label}</Text>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationSection({
  title,
  integrations,
  onRefresh,
}: {
  title: string;
  integrations: Integration[];
  onRefresh: () => void;
}) {
  return (
    <div>
      <Text size="lg" weight="semibold">{title}</Text>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
