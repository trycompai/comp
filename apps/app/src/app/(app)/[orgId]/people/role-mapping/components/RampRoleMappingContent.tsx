'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@trycompai/design-system';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { RampRoleMappingRow } from './RampRoleMappingRow';
import type { RoleMappingEntry } from './RampRoleMappingRow';

interface DiscoveredRole {
  role: string;
  userCount: number;
}

interface DiscoverRolesResponse {
  discoveredRoles: DiscoveredRole[];
  defaultMapping: RoleMappingEntry[];
  existingMapping: RoleMappingEntry[] | null;
  existingCustomRoles: Array<{
    name: string;
    permissions: Record<string, string[]>;
    obligations: Record<string, boolean>;
  }>;
}

interface RampRoleMappingContentProps {
  organizationId: string;
  connectionId: string;
}

export function RampRoleMappingContent({
  organizationId,
  connectionId,
}: RampRoleMappingContentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mapping, setMapping] = useState<RoleMappingEntry[]>([]);
  const savedMappingRef = useRef<string>('');
  const [discoveredRoles, setDiscoveredRoles] = useState<DiscoveredRole[]>([]);
  const [existingCustomRoles, setExistingCustomRoles] = useState<
    Array<{
      name: string;
      permissions: Record<string, string[]>;
      obligations: Record<string, boolean>;
    }>
  >([]);

  const fetchRoles = async (refresh = false) => {
    try {
      const refreshParam = refresh ? '&refresh=true' : '';
      const response = await apiClient.post<DiscoverRolesResponse>(
        `/v1/integrations/sync/ramp/discover-roles?organizationId=${organizationId}&connectionId=${connectionId}${refreshParam}`,
      );

      if (response.data) {
        const initialMapping =
          response.data.existingMapping ?? response.data.defaultMapping;
        setDiscoveredRoles(response.data.discoveredRoles);
        setExistingCustomRoles(response.data.existingCustomRoles);
        setMapping(initialMapping);
        savedMappingRef.current = JSON.stringify(initialMapping);
      }
    } catch (error) {
      toast.error('Failed to load Ramp roles');
      throw error;
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        await fetchRoles();
      } catch {
        // error toast already shown by fetchRoles
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [organizationId, connectionId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRoles(true);
      toast.success('Roles refreshed from Ramp');
    } catch {
      // fetchRoles already shows error toast
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEntryChange = (index: number, updated: RoleMappingEntry) => {
    setMapping((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiClient.post(
        `/v1/integrations/sync/ramp/role-mapping?organizationId=${organizationId}`,
        { connectionId, mapping },
      );

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success('Role mapping saved');
      savedMappingRef.current = JSON.stringify(mapping);
    } catch {
      toast.error('Failed to save role mapping');
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty = JSON.stringify(mapping) !== savedMappingRef.current;

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg border bg-muted/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (mapping.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No roles discovered from Ramp. Try syncing employees first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Ramp Role
        </p>
        <div />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Comp AI Role
        </p>
      </div>

      {/* Mapping rows */}
      <div>
        {mapping.map((entry, index) => (
          <RampRoleMappingRow
            key={entry.rampRole}
            entry={entry}
            existingCustomRoles={existingCustomRoles}
            onChange={(updated) => handleEntryChange(index, updated)}
          />
        ))}
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground">
        Members with Owner, Admin, or Auditor roles in Comp AI are not
        affected by sync — their roles are preserved.
      </p>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing || isSaving}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Roles'}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? 'Saving...' : 'Save Mapping'}
        </Button>
      </div>
    </div>
  );
}
