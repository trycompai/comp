'use client';

import { Search } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import { ServiceCard } from './ServiceCard';

export function ServicesGrid({
  services,
  connectionServices,
  connectionId,
  onToggle,
  togglingService,
}: {
  services: Array<{ id: string; name: string; description: string; implemented?: boolean }>;
  connectionServices: Array<{ id: string; enabled: boolean }>;
  connectionId: string | null;
  onToggle: (id: string, enabled: boolean) => void;
  togglingService: string | null;
}) {
  const [search, setSearch] = useState('');

  const enabledSet = useMemo(
    () => new Set(connectionServices.filter((s) => s.enabled).map((s) => s.id)),
    [connectionServices],
  );

  const sortedServices = useMemo(() => {
    const filtered = search
      ? services.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.id.toLowerCase().includes(search.toLowerCase()),
        )
      : services;

    return [...filtered].sort((a, b) => {
      const aEnabled = enabledSet.has(a.id) ? 1 : 0;
      const bEnabled = enabledSet.has(b.id) ? 1 : 0;
      const aImpl = a.implemented !== false ? 1 : 0;
      const bImpl = b.implemented !== false ? 1 : 0;
      if (bEnabled !== aEnabled) return bEnabled - aEnabled;
      if (bImpl !== aImpl) return bImpl - aImpl;
      return a.name.localeCompare(b.name);
    });
  }, [services, search, enabledSet]);

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
        {sortedServices.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            connectionId={connectionId}
            isConnected
            onToggle={onToggle}
            toggling={togglingService === service.id}
          />
        ))}
        {sortedServices.length === 0 && search && (
          <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
            No services matching &quot;{search}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
