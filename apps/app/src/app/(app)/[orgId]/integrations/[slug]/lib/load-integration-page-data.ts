import { serverApi } from '@/lib/api-server';
import type {
  ConnectionListItemResponse,
  IntegrationProviderResponse,
} from '@trycompai/integration-platform';
import {
  type IntegrationTaskApiResponse,
  type MappedTaskTemplate,
  mapTaskTemplates,
} from './task-templates';

export interface IntegrationPageData {
  /** Null when the provider couldn't be loaded; the caller should redirect. */
  provider: IntegrationProviderResponse | null;
  providerErrored: boolean;
  /** Connections already filtered to this provider's slug. */
  connections: ConnectionListItemResponse[];
  connectionsErrored: boolean;
  taskTemplates: MappedTaskTemplate[];
  tasksErrored: boolean;
}

/**
 * Shared server-side loader for the integration detail pages (provider page and
 * per-service page). Fetches the provider, the org's connections (filtered to
 * this provider), and the org's tasks (projected to mapped templates) in one
 * round-trip, surfacing each fetch's error so the UI can distinguish "empty"
 * from "couldn't load" rather than silently swallowing failures.
 */
export async function loadIntegrationPageData(
  slug: string,
  opts: { sortTasks?: boolean } = {},
): Promise<IntegrationPageData> {
  const [providerResult, connectionsResult, tasksResult] = await Promise.all([
    serverApi.get<IntegrationProviderResponse>(
      `/v1/integrations/connections/providers/${slug}`,
    ),
    serverApi.get<ConnectionListItemResponse[]>('/v1/integrations/connections'),
    serverApi.get<IntegrationTaskApiResponse>('/v1/tasks'),
  ]);

  const connections = (connectionsResult.data ?? []).filter(
    (c) => c.providerSlug === slug,
  );
  const { templates: taskTemplates, errored: tasksErrored } = mapTaskTemplates(
    tasksResult,
    { sort: opts.sortTasks },
  );

  return {
    provider: providerResult.data ?? null,
    providerErrored: Boolean(providerResult.error),
    connections,
    connectionsErrored: Boolean(connectionsResult.error),
    taskTemplates,
    tasksErrored,
  };
}
