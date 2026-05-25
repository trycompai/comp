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
  updateCell: (rowId: string, columnId: string, value: string | string[]) => void;
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
  updateCell,
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
      for (const row of data) {
        if (row.controlFamily === oldName) {
          updateCell(row.id, 'controlFamily', newName);
        }
      }
    },
    [data, updateCell],
  );

  const handleDeleteFamily = useCallback(
    (familyName: string) => {
      for (const row of data) {
        if (row.controlFamily === familyName) {
          updateCell(row.id, 'controlFamily', '');
        }
      }
    },
    [data, updateCell],
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
