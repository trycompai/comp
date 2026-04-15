'use client';

import { orderServicesForConnectionGrid } from '@/lib/connection-services-display-order';
import { Search } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ServiceCard } from './ServiceCard';

export function ServicesGrid({
  services,
  connectionServices = [],
  connectionId,
  onToggle,
  togglingService,
}: {
  services: Array<{ id: string; name: string; description: string; implemented?: boolean }>;
  connectionServices?: Array<{ id: string; enabled: boolean }>;
  connectionId: string | null;
  onToggle: (id: string, enabled: boolean) => boolean | void | Promise<boolean | void>;
  togglingService: string | null;
}) {
  const [search, setSearch] = useState('');
  const [tailEnabledIds, setTailEnabledIds] = useState<string[]>([]);

  useEffect(() => {
    setTailEnabledIds([]);
  }, [connectionId]);

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      let rollback: string[] | null = null;
      setTailEnabledIds((prev) => {
        rollback = [...prev];
        if (enabled) return [...prev.filter((x) => x !== id), id];
        return prev.filter((x) => x !== id);
      });
      const result = await Promise.resolve(onToggle(id, enabled));
      if (result === false && rollback) {
        setTailEnabledIds(rollback);
      }
    },
    [onToggle],
  );

  const displayedServices = useMemo(
    () =>
      orderServicesForConnectionGrid({
        manifestServices: services,
        connectionServices,
        search,
        tailEnabledIds,
      }),
    [services, connectionServices, search, tailEnabledIds],
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
            isConnected
            onToggle={handleToggle}
            toggling={togglingService === service.id}
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
