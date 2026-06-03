'use client';

import { orderServicesForConnectionGrid } from '@/lib/connection-services-display-order';
import { Search } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import { ServiceCard } from './ServiceCard';

export function ServicesGrid({
  services,
  connectionServices = [],
  connectionId,
  orgId,
  slug,
  taskTemplates,
}: {
  services: Array<{
    id: string;
    name: string;
    description: string;
    implemented?: boolean;
    mappedTasks?: Array<{ id: string; name: string }>;
  }>;
  connectionServices?: Array<{ id: string; enabled: boolean }>;
  connectionId: string | null;
  orgId: string;
  slug: string;
  /** Org task templates (live tasks). Used to count only added evidence tasks. */
  taskTemplates?: Array<{ id: string }>;
}) {
  const [search, setSearch] = useState('');

  // Template ids the org actually has a live task for — so each card counts
  // only added evidence tasks (matching the service detail page). Stays
  // undefined when taskTemplates isn't provided so ServiceCard falls back to
  // counting all mapped tasks; an explicit empty array still means "none added"
  // (count 0), matching the detail page for an org with no live tasks.
  const addedTemplateIds = useMemo(
    () => (taskTemplates ? new Set(taskTemplates.map((t) => t.id)) : undefined),
    [taskTemplates],
  );

  const displayedServices = useMemo(
    () =>
      orderServicesForConnectionGrid({
        manifestServices: services,
        connectionServices,
        search,
        tailEnabledIds: [],
      }),
    [services, connectionServices, search],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
          />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44 rounded-md border bg-background py-1.5 pl-7 pr-3 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {displayedServices.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            connectionId={connectionId}
            orgId={orgId}
            slug={slug}
            addedTemplateIds={addedTemplateIds}
          />
        ))}
        {displayedServices.length === 0 && search && (
          <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
            No services matching &quot;{search}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
