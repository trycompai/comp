'use client';

import type { FrameworkEditorFrameworkFamilyStatus } from '@/db';
import { Button } from '@trycompai/ui/button';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { FrameworkWithCounts } from '../FrameworksClientPage';
import { FamilyStatusBadge, FrameworkVisibilityBadge } from './family-status';

interface FrameworkFamilySectionProps {
  title: string;
  // Undefined for the "Ungrouped" pseudo-section (no status / actions).
  status?: FrameworkEditorFrameworkFamilyStatus;
  // True framework count (drives the "n frameworks / Empty" label and the
  // empty-only delete rule) — independent of the possibly-filtered rows below.
  count: number;
  frameworks: FrameworkWithCounts[];
  onEdit?: () => void;
  onDelete?: () => void;
  defaultOpen?: boolean;
}

export function FrameworkFamilySection({
  title,
  status,
  count,
  frameworks,
  onEdit,
  onDelete,
  defaultOpen = true,
}: FrameworkFamilySectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isFamily = status !== undefined;
  const countLabel = count === 0 ? 'Empty' : `${count} framework${count === 1 ? '' : 's'}`;

  return (
    <div className="rounded-md border">
      <div className="bg-muted/40 flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <span className="font-medium">{title}</span>
          <span className="text-muted-foreground text-xs">{countLabel}</span>
          {status && <FamilyStatusBadge status={status} />}
        </button>
        {isFamily && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEdit}
                aria-label="Edit family"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive h-7 w-7"
                onClick={onDelete}
                disabled={count > 0}
                title={count > 0 ? 'Family must be empty to delete' : 'Delete family'}
                aria-label="Delete family"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      {open && (
        <div className="overflow-x-auto">
          {frameworks.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-sm">
              No frameworks in this {isFamily ? 'family' : 'group'}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Version</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Requirements</th>
                  <th className="px-3 py-2 font-medium">Controls</th>
                </tr>
              </thead>
              <tbody>
                {frameworks.map((fw) => (
                  <tr key={fw.id} className="hover:bg-muted/30 border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/frameworks/${fw.id}`} className="hover:underline">
                        {fw.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{fw.latestVersion?.version ?? fw.version}</td>
                    <td className="px-3 py-2">
                      <FrameworkVisibilityBadge visible={fw.visible} />
                    </td>
                    <td className="px-3 py-2">{fw.requirementsCount}</td>
                    <td className="px-3 py-2">{fw.controlsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
