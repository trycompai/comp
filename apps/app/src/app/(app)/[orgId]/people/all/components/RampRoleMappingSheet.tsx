'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@trycompai/design-system';
import { Close } from '@trycompai/design-system/icons';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { RampRoleMappingRow } from '../../role-mapping/components/RampRoleMappingRow';
import type { RoleMappingEntry } from '../../role-mapping/components/RampRoleMappingRow';
import type { RoleMappingData } from '../hooks/useEmployeeSync';

interface RampRoleMappingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  data: RoleMappingData;
  onSaved: () => void;
}

export function RampRoleMappingSheet({
  open,
  onOpenChange,
  organizationId,
  data,
  onSaved,
}: RampRoleMappingSheetProps) {
  const initialMapping = data.existingMapping ?? data.defaultMapping;
  const [mapping, setMapping] = useState<RoleMappingEntry[]>(initialMapping);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        { connectionId: data.connectionId, mapping },
      );

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success('Role mapping saved');
      onSaved();
    } catch {
      toast.error('Failed to save role mapping');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/10 backdrop-blur-xs"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-background rounded-xl ring-1 ring-foreground/10 shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto animate-in fade-in-0 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 pb-0">
            <div className="space-y-1.5">
              <h2 className="text-sm font-medium leading-none">
                Configure Ramp Role Mapping
              </h2>
              <p className="text-sm text-muted-foreground">
                Map Ramp roles to your organization&apos;s roles. Custom roles
                will be created automatically with default permissions you can
                customize.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1"
            >
              <Close size={16} />
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center px-4 pt-4 pb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ramp Role
            </p>
            <div />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Comp AI Role
            </p>
          </div>

          {/* Mapping rows */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {mapping.map((entry, index) => (
                <RampRoleMappingRow
                  key={entry.rampRole}
                  entry={entry}
                  existingCustomRoles={data.existingCustomRoles}
                  onChange={(updated) => handleEntryChange(index, updated)}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted border-t rounded-b-xl p-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save & Sync'}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
