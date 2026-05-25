import { useCallback, useMemo, useState } from 'react';
import type { ControlsPageGridData } from '../types';

interface FamilyControl {
  id: string;
  name: string | null;
  frameworks: string[];
}

interface Family {
  name: string;
  controls: FamilyControl[];
}

interface UseFamiliesManagementParams {
  data: ControlsPageGridData[];
  batchUpdateCells: (updates: Array<{ rowId: string; columnId: string; value: string | string[] | null }>) => void;
}

interface UseFamiliesManagementReturn {
  families: Family[];
  uniqueFamilies: string[];
  manageFamiliesOpen: boolean;
  setManageFamiliesOpen: (open: boolean) => void;
  handleRenameFamily: (oldName: string, newName: string) => void;
  handleDeleteFamily: (familyName: string) => void;
}

export function useFamiliesManagement({
  data,
  batchUpdateCells,
}: UseFamiliesManagementParams): UseFamiliesManagementReturn {
  const [manageFamiliesOpen, setManageFamiliesOpen] = useState(false);

  const families = useMemo(() => {
    const familyMap = new Map<string, FamilyControl[]>();
    for (const row of data) {
      if (row.controlFamily) {
        const controls = familyMap.get(row.controlFamily) ?? [];
        const frameworks = [
          ...new Set(
            row.requirements
              .map((r) => r.sublabel)
              .filter((s): s is string => s != null && s !== ''),
          ),
        ];
        controls.push({ id: row.id, name: row.name, frameworks });
        familyMap.set(row.controlFamily, controls);
      }
    }
    return [...familyMap.entries()]
      .map(([name, controls]) => ({ name, controls }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const uniqueFamilies = useMemo(
    () =>
      [
        ...new Set(
          data
            .map((r) => r.controlFamily)
            .filter((f): f is string => f != null && f !== ''),
        ),
      ].sort(),
    [data],
  );

  const handleRenameFamily = useCallback(
    (oldName: string, newName: string) => {
      const updates = data
        .filter((row) => row.controlFamily === oldName)
        .map((row) => ({ rowId: row.id, columnId: 'controlFamily', value: newName }));
      batchUpdateCells(updates);
    },
    [data, batchUpdateCells],
  );

  const handleDeleteFamily = useCallback(
    (familyName: string) => {
      const updates = data
        .filter((row) => row.controlFamily === familyName)
        .map((row) => ({ rowId: row.id, columnId: 'controlFamily', value: null as null }));
      batchUpdateCells(updates);
    },
    [data, batchUpdateCells],
  );

  return {
    families,
    uniqueFamilies,
    manageFamiliesOpen,
    setManageFamiliesOpen,
    handleRenameFamily,
    handleDeleteFamily,
  };
}
