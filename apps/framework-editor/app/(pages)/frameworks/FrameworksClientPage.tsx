'use client';

import PageLayout from '@/app/components/PageLayout';
import type { FrameworkEditorFramework, FrameworkEditorFrameworkFamilyStatus } from '@/db';
import { Button } from '@trycompai/ui/button';
import { Input } from '@trycompai/ui/input';
import { FolderPlus, Plus, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CreateFrameworkDialog } from './components/CreateFrameworkDialog';
import { DeleteFrameworkFamilyDialog } from './components/DeleteFrameworkFamilyDialog';
import { FrameworkFamilyDialog } from './components/FrameworkFamilyDialog';
import { FrameworkFamilySection } from './components/FrameworkFamilySection';
import { ImportFrameworkDialog } from './components/ImportFrameworkDialog';
import { MoveFrameworkDialog } from './components/MoveFrameworkDialog';

export interface FrameworkWithCounts extends Omit<FrameworkEditorFramework, 'requirements'> {
  requirementsCount: number;
  controlsCount: number;
  latestVersion: { id: string; version: string; publishedAt: string } | null;
}

export interface FrameworkFamilyWithCount {
  id: string;
  name: string;
  description: string;
  status: FrameworkEditorFrameworkFamilyStatus;
  frameworksCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FrameworksClientPageProps {
  initialFrameworks: FrameworkWithCounts[];
  initialFamilies: FrameworkFamilyWithCount[];
}

export function FrameworksClientPage({
  initialFrameworks,
  initialFamilies,
}: FrameworksClientPageProps) {
  const [search, setSearch] = useState('');
  const [isCreateFrameworkOpen, setIsCreateFrameworkOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  // Move is scoped to the section it's opened from ("frameworks in the current
  // family", per FRAME-20) — these are the source frameworks for the dialog.
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean;
    frameworks: FrameworkWithCounts[];
  }>({ open: false, frameworks: [] });
  const [familyDialog, setFamilyDialog] = useState<{
    open: boolean;
    family: FrameworkFamilyWithCount | null;
  }>({ open: false, family: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    family: FrameworkFamilyWithCount | null;
  }>({ open: false, family: null });

  const searching = search.trim().length > 0;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return initialFrameworks;
    return initialFrameworks.filter((fw) => fw.name.toLowerCase().includes(term));
  }, [initialFrameworks, search]);

  const { byFamilyId, ungrouped } = useMemo(() => {
    const map = new Map<string, FrameworkWithCounts[]>();
    const root: FrameworkWithCounts[] = [];
    for (const fw of filtered) {
      if (fw.familyId) {
        const arr = map.get(fw.familyId);
        if (arr) arr.push(fw);
        else map.set(fw.familyId, [fw]);
      } else {
        root.push(fw);
      }
    }
    return { byFamilyId: map, ungrouped: root };
  }, [filtered]);

  const sortedFamilies = useMemo(
    () => [...initialFamilies].sort((a, b) => a.name.localeCompare(b.name)),
    [initialFamilies],
  );

  // True (unfiltered) count of ungrouped frameworks — drives the label and the
  // move scope regardless of the search filter.
  const ungroupedTotal = useMemo(
    () => initialFrameworks.filter((fw) => !fw.familyId).length,
    [initialFrameworks],
  );

  // The full (unfiltered) framework list for a given family (null = ungrouped),
  // used as the move dialog's scoped source.
  const frameworksOf = (familyId: string | null) =>
    initialFrameworks.filter((fw) => (fw.familyId ?? null) === familyId);

  return (
    <PageLayout breadcrumbs={[{ label: 'Frameworks', href: '/frameworks' }]}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input
            placeholder="Search frameworks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              onClick={() => setFamilyDialog({ open: true, family: null })}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Create New Framework Family
            </Button>
            <Button onClick={() => setIsCreateFrameworkOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Framework
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {sortedFamilies.map((family) => {
            const frameworks = byFamilyId.get(family.id) ?? [];
            // While searching, hide families with no matching frameworks.
            if (searching && frameworks.length === 0) return null;
            return (
              <FrameworkFamilySection
                key={family.id}
                title={family.name}
                status={family.status}
                count={family.frameworksCount}
                frameworks={frameworks}
                onMove={() =>
                  setMoveDialog({ open: true, frameworks: frameworksOf(family.id) })
                }
                onEdit={() => setFamilyDialog({ open: true, family })}
                onDelete={() => setDeleteDialog({ open: true, family })}
              />
            );
          })}
          {(!searching || ungrouped.length > 0) && (
            <FrameworkFamilySection
              title="Ungrouped"
              count={ungroupedTotal}
              frameworks={ungrouped}
              onMove={() => setMoveDialog({ open: true, frameworks: frameworksOf(null) })}
            />
          )}
        </div>
      </div>

      <CreateFrameworkDialog
        isOpen={isCreateFrameworkOpen}
        onOpenChange={setIsCreateFrameworkOpen}
        onFrameworkCreated={() => setIsCreateFrameworkOpen(false)}
      />
      <ImportFrameworkDialog isOpen={isImportOpen} onOpenChange={setIsImportOpen} />
      <MoveFrameworkDialog
        isOpen={moveDialog.open}
        onOpenChange={(open) => setMoveDialog((s) => ({ ...s, open }))}
        frameworks={moveDialog.frameworks}
        families={initialFamilies}
      />
      <FrameworkFamilyDialog
        isOpen={familyDialog.open}
        onOpenChange={(open) => setFamilyDialog((s) => ({ ...s, open }))}
        family={familyDialog.family}
      />
      {deleteDialog.family && (
        <DeleteFrameworkFamilyDialog
          isOpen={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog((s) => ({ ...s, open }))}
          familyId={deleteDialog.family.id}
          familyName={deleteDialog.family.name}
        />
      )}
    </PageLayout>
  );
}
