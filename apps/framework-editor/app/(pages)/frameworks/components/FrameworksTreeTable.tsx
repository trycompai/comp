'use client';

import {
  ColumnResizeHandle,
  useResizableColumns,
} from '@/app/components/table/resizable-columns';
import { Button } from '@trycompai/ui/button';
import { ChevronDown, ChevronRight, FileText, Folder, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { FrameworkFamilyWithCount, FrameworkWithCounts } from '../FrameworksClientPage';
import { FamilyStatusBadge, FrameworkVisibilityBadge } from './family-status';

// A flat row in the unified Finder-style list: families (folders) and the
// frameworks (files) underneath them share one set of columns.
export type TreeRow =
  | { kind: 'family'; family: FrameworkFamilyWithCount; expanded: boolean }
  | { kind: 'framework'; framework: FrameworkWithCounts; indented: boolean };

interface FrameworksTreeTableProps {
  rows: TreeRow[];
  onToggle: (familyId: string) => void;
  onEditFamily: (family: FrameworkFamilyWithCount) => void;
  onDeleteFamily: (family: FrameworkFamilyWithCount) => void;
}

// FRAME-17: resizable columns, persisted to a cookie.
const COOKIE_NAME = 'fwk-frameworks-list-col-widths';
const COLUMNS: {
  key: string;
  label: string;
  defaultWidth: number;
  align: 'left' | 'center';
  resizable: boolean;
}[] = [
  { key: 'name', label: 'Name', defaultWidth: 360, align: 'left', resizable: true },
  { key: 'version', label: 'Version', defaultWidth: 120, align: 'center', resizable: true },
  { key: 'status', label: 'Status', defaultWidth: 140, align: 'center', resizable: true },
  {
    key: 'requirements',
    label: 'Requirements',
    defaultWidth: 150,
    align: 'center',
    resizable: true,
  },
  { key: 'controls', label: 'Controls', defaultWidth: 120, align: 'center', resizable: true },
  { key: 'actions', label: '', defaultWidth: 88, align: 'center', resizable: false },
];
const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.defaultWidth]));

// Frameworks nested in a family indent ~6 characters past the root, like a file
// inside a folder in Finder / Windows Explorer.
const NESTED_INDENT_PX = 48;
const CENTER_CELL = 'px-3 py-2 text-center align-middle';

export function FrameworksTreeTable({
  rows,
  onToggle,
  onEditFamily,
  onDeleteFamily,
}: FrameworksTreeTableProps) {
  const { widths, startResize } = useResizableColumns(COOKIE_NAME, DEFAULT_WIDTHS);
  const totalWidth = COLUMNS.reduce((sum, c) => sum + (widths[c.key] ?? c.defaultWidth), 0);

  return (
    <div className="scrollbar-primary border-border overflow-x-auto rounded-xs border">
      <table
        className="border-collapse text-sm"
        style={{ tableLayout: 'fixed', width: totalWidth, minWidth: '100%' }}
      >
        <colgroup>
          {COLUMNS.map((c) => (
            <col key={c.key} style={{ width: widths[c.key] ?? c.defaultWidth }} />
          ))}
        </colgroup>
        <thead className="bg-muted/50">
          <tr className="text-muted-foreground text-xs">
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={`relative px-3 py-2 font-medium ${
                  c.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {c.label}
                {c.resizable && (
                  <ColumnResizeHandle onResizeStart={(e) => startResize(c.key, e)} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="text-muted-foreground py-8 text-center">
                No frameworks yet.
              </td>
            </tr>
          )}
          {rows.map((row) =>
            row.kind === 'family' ? (
              <FamilyRow
                key={`fam_${row.family.id}`}
                family={row.family}
                expanded={row.expanded}
                onToggle={onToggle}
                onEdit={onEditFamily}
                onDelete={onDeleteFamily}
              />
            ) : (
              <FrameworkRow
                key={`fw_${row.framework.id}`}
                framework={row.framework}
                indented={row.indented}
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function FamilyRow({
  family,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  family: FrameworkFamilyWithCount;
  expanded: boolean;
  onToggle: (familyId: string) => void;
  onEdit: (family: FrameworkFamilyWithCount) => void;
  onDelete: (family: FrameworkFamilyWithCount) => void;
}) {
  const countLabel =
    family.frameworksCount === 0
      ? 'Empty'
      : `${family.frameworksCount} framework${family.frameworksCount === 1 ? '' : 's'}`;
  const empty = family.frameworksCount === 0;

  return (
    <tr className="border-border hover:bg-muted/30 border-b transition-colors">
      <td className="overflow-hidden px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggle(family.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label={expanded ? 'Collapse family' : 'Expand family'}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <Folder className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="truncate font-medium">{family.name}</span>
        </div>
      </td>
      <td className={`${CENTER_CELL} text-muted-foreground`}>{countLabel}</td>
      <td className={CENTER_CELL}>
        <FamilyStatusBadge status={family.status} />
      </td>
      <td className={CENTER_CELL} />
      <td className={CENTER_CELL} />
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(family)}
            aria-label="Edit family"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-7 w-7"
            onClick={() => onDelete(family)}
            disabled={!empty}
            title={empty ? 'Delete family' : 'Family must be empty to delete'}
            aria-label="Delete family"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function FrameworkRow({
  framework,
  indented,
}: {
  framework: FrameworkWithCounts;
  indented: boolean;
}) {
  return (
    <tr className="border-border hover:bg-muted/30 border-b transition-colors">
      <td className="overflow-hidden px-3 py-2">
        <div
          className="flex min-w-0 items-center gap-1.5"
          style={{ paddingLeft: indented ? NESTED_INDENT_PX : 0 }}
        >
          {/* Spacer matching the family chevron so names line up. */}
          <span className="inline-block w-4 shrink-0" />
          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
          <Link href={`/frameworks/${framework.id}`} className="truncate hover:underline">
            {framework.name}
          </Link>
        </div>
      </td>
      <td className={CENTER_CELL}>
        {framework.latestVersion?.version ?? framework.version}
      </td>
      <td className={CENTER_CELL}>
        <FrameworkVisibilityBadge visible={framework.visible} />
      </td>
      <td className={CENTER_CELL}>{framework.requirementsCount}</td>
      <td className={CENTER_CELL}>{framework.controlsCount}</td>
      <td className="px-3 py-2" />
    </tr>
  );
}
