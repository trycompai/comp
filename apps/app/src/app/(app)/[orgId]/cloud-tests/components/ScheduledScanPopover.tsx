'use client';

import { useApi } from '@/hooks/use-api';
import { useConnectionServices } from '@/hooks/use-integration-platform';
import { Popover, PopoverContent, PopoverTrigger } from '@trycompai/ui/popover';
import { Checkbox } from '@trycompai/ui/checkbox';
import { Button, cn } from '@trycompai/design-system';
import { EventSchedule } from '@trycompai/design-system/icons';
import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ScheduledScanPopoverProps {
  connectionId: string;
}

export function ScheduledScanPopover({ connectionId }: ScheduledScanPopoverProps) {
  const apiClient = useApi();
  const { services, refresh: refreshServices } = useConnectionServices(connectionId);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const filteredServices = useMemo(() => {
    if (!search) return services.filter((s) => s.implemented !== false);
    const q = search.toLowerCase();
    return services
      .filter((s) => s.implemented !== false)
      .filter(
        (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
      );
  }, [services, search]);

  const implementedServices = services.filter((s) => s.implemented !== false);
  const enabledCount = implementedServices.filter((s) => s.enabled).length;

  const handleToggle = useCallback(async (serviceId: string, enabled: boolean) => {
    setSaving(serviceId);
    try {
      const newEnabledIds = services
        .filter((s) => (s.id === serviceId ? enabled : s.enabled))
        .map((s) => s.id);
      await apiClient.put(
        `/v1/integrations/connections/${connectionId}/services`,
        { services: newEnabledIds },
      );
      await refreshServices();
    } finally {
      setSaving(null);
    }
  }, [services, connectionId, apiClient, refreshServices]);

  const handleEnableAll = useCallback(async () => {
    setSaving('all');
    try {
      const allIds = implementedServices.map((s) => s.id);
      await apiClient.put(
        `/v1/integrations/connections/${connectionId}/services`,
        { services: allIds },
      );
      await refreshServices();
      toast.success('All services enabled');
    } finally {
      setSaving(null);
    }
  }, [implementedServices, connectionId, apiClient, refreshServices]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <EventSchedule size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Schedule header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">Daily scan</p>
            <p className="text-xs text-muted-foreground">Every day at 5:00 AM UTC</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
            Active
          </span>
        </div>

        {/* Service toggles */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {enabledCount} of {implementedServices.length} services
            </p>
            <button
              type="button"
              onClick={handleEnableAll}
              disabled={saving === 'all' || enabledCount === implementedServices.length}
              className="text-[11px] font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors"
            >
              Enable all
            </button>
          </div>
        </div>

        {/* Search (only if many services) */}
        {implementedServices.length > 8 && (
          <div className="px-4 py-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border bg-background pl-7 pr-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {/* Service list */}
        <div className="max-h-[280px] overflow-y-auto px-2 py-1">
          {filteredServices.map((service) => (
            <label
              key={service.id}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors hover:bg-muted/40 text-xs',
                saving === service.id && 'opacity-60 pointer-events-none',
              )}
            >
              <Checkbox
                checked={service.enabled}
                onCheckedChange={(checked) => handleToggle(service.id, checked === true)}
                disabled={saving !== null}
                className="h-3.5 w-3.5"
              />
              <span className="truncate">{service.name}</span>
            </label>
          ))}
          {filteredServices.length === 0 && search && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No services match &quot;{search}&quot;
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
