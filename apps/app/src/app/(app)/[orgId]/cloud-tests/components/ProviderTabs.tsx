import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { Finding, Provider } from '../types';
import { ResultsView } from './ResultsView';

interface ProviderTabsProps {
  providerGroups: Record<string, Provider[]>;
  providerTypes: string[];
  activeProviderType: string;
  activeConnectionTabs: Record<string, string>;
  findingsByProvider: Record<string, Finding[]>;
  isScanning: boolean;
  onProviderTypeChange: (value: string) => void;
  onConnectionTabChange: (providerType: string, connectionId: string) => void;
  onRunScan: (connectionId?: string) => Promise<string | null>;
  onAddConnection: (providerType: string) => void;
  onConfigure: (provider: Provider) => void;
  needsConfiguration: (provider: Provider) => boolean;
}

const formatProviderLabel = (providerType: string): string => {
  const normalized = providerType.trim();
  if (!normalized) return 'UNKNOWN';

  if (['aws', 'gcp', 'iam'].includes(normalized.toLowerCase())) {
    return normalized.toUpperCase();
  }

  return normalized
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const extractRegionFromTitle = (title: string | null | undefined): string | null => {
  if (!title) return null;
  const match = title.match(/\s\(([-a-z0-9]+)\)\s*$/i);
  if (!match) return null;
  return match[1].toLowerCase();
};

const stripRegionSuffix = (title: string | null | undefined): string | null => {
  if (!title) return null;
  return title.replace(/\s\(([-a-z0-9]+)\)\s*$/i, '').trim();
};

const buildRegionOptions = (
  connection: Provider,
  findings: Finding[],
): Array<{ id: string; label: string }> => {
  const regionMap = new Map<string, string>();

  if (connection.regions?.length) {
    for (const region of connection.regions) {
      regionMap.set(region.toLowerCase(), region);
    }
  } else {
    for (const finding of findings) {
      const region = extractRegionFromTitle(finding.title);
      if (region && !regionMap.has(region)) {
        regionMap.set(region, region);
      }
    }
  }

  return Array.from(regionMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, label]) => ({ id, label }));
};

function ConnectionDetails({ connection }: { connection: Provider }) {
  const details: string[] = [];

  if (connection.accountId) {
    details.push(`Account: ${connection.accountId}`);
  }

  if (connection.regions?.length) {
    details.push(
      `${connection.regions.length} region${connection.regions.length !== 1 ? 's' : ''}`,
    );
  }

  if (connection.lastRunAt) {
    details.push(`Last scan: ${new Date(connection.lastRunAt).toLocaleString()}`);
  }

  if (details.length === 0) return null;

  return (
    <div className="mb-4 ml-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      {details.map((detail, index) => (
        <span key={detail} className="flex items-center gap-1">
          {index > 0 && <span className="mr-2">•</span>}
          {detail}
        </span>
      ))}
    </div>
  );
}

export function ProviderTabs({
  providerGroups,
  providerTypes,
  activeProviderType,
  activeConnectionTabs,
  findingsByProvider,
  isScanning,
  onProviderTypeChange,
  onConnectionTabChange,
  onRunScan,
  onAddConnection,
  onConfigure,
  needsConfiguration,
}: ProviderTabsProps) {
  const [activeRegionTabs, setActiveRegionTabs] = useState<Record<string, string>>({});

  return (
    <Tabs value={activeProviderType} onValueChange={onProviderTypeChange}>
      <div className="mb-4">
        <TabsList>
          {providerTypes.map((providerType) => {
            const connectionCount = providerGroups[providerType]?.length || 0;
            const label = formatProviderLabel(providerType);
            return (
              <TabsTrigger key={providerType} value={providerType}>
                {label}
                {connectionCount > 1 && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {connectionCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {providerTypes.map((providerType) => {
        const connections = providerGroups[providerType] || [];
        const activeConnId = activeConnectionTabs[providerType] || connections[0]?.id;

        if (connections.length === 0) {
          return <TabsContent key={providerType} value={providerType} />;
        }

        return (
          <TabsContent key={providerType} value={providerType}>
            <div className="mb-4 rounded-lg border bg-card p-4">
              <Tabs
                value={activeConnId}
                onValueChange={(value) => onConnectionTabChange(providerType, value)}
              >
                <div className="mb-3 flex items-center justify-between">
                  <Select
                    value={activeConnId}
                    onValueChange={(value) => onConnectionTabChange(providerType, value)}
                  >
                    <SelectTrigger className="h-9 w-[240px] rounded-lg">
                      <SelectValue placeholder="Select connection" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {connections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.displayName || connection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="lg"
                    iconLeft={<Add size={16} />}
                    onClick={() => onAddConnection(providerType)}
                  >
                    Add connection
                  </Button>
                </div>

                {connections.map((connection) => {
                  const connFindings = findingsByProvider[connection.id] ?? [];
                  const regionOptions = buildRegionOptions(connection, connFindings);
                  const showRegionTabs =
                    connection.integrationId.toLowerCase() === 'aws' && regionOptions.length >= 1;
                  const activeRegion = activeRegionTabs[connection.id] || 'all';
                  const filteredFindings =
                    showRegionTabs && activeRegion !== 'all'
                      ? connFindings.filter(
                          (finding) => extractRegionFromTitle(finding.title) === activeRegion,
                        )
                      : connFindings;
                  const displayFindings = filteredFindings.map((finding) => ({
                    ...finding,
                    title: stripRegionSuffix(finding.title),
                  }));

                  return (
                    <TabsContent key={connection.id} value={connection.id}>
                      <div className="mt-4">
                        <ConnectionDetails connection={connection} />

                        {showRegionTabs && (
                          <div className="mb-4">
                            <Tabs
                              value={activeRegion}
                              onValueChange={(value) =>
                                setActiveRegionTabs((prev) => ({
                                  ...prev,
                                  [connection.id]: value,
                                }))
                              }
                            >
                              <TabsList>
                                <TabsTrigger value="all">All regions</TabsTrigger>
                                {regionOptions.map((region) => (
                                  <TabsTrigger key={region.id} value={region.id}>
                                    {region.label}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                            </Tabs>
                          </div>
                        )}

                        <ResultsView
                          findings={displayFindings}
                          onRunScan={() => onRunScan(connection.id)}
                          isScanning={isScanning}
                          needsConfiguration={needsConfiguration(connection)}
                          onConfigure={() => onConfigure(connection)}
                        />
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
