'use client';

import { Button } from '@comp/ui/button';
import { useRouter } from 'next/navigation';
import React from 'react';
import type { CellProps } from 'react-datasheet-grid';
import type { ControlsPageGridData } from '../../(pages)/controls/types'; // Needs to be generic or passed in

// TODO: Make rowData type generic to be reusable for Tasks, etc.
// For now, keeping ControlsPageGridData to ensure it works for existing usage.
// We can create a more generic interface like `GridDataWithIdAndName` if needed.
export const ActionCell: React.FC<CellProps<ControlsPageGridData, any>> = ({ rowData }) => {
  const router = useRouter();

  if (!rowData || !rowData.id) {
    return null;
  }

  // TODO: The navigation path should be made dynamic or passed as a prop.
  // For example, instead of hardcoding '/controls/', it could be a base path prop.
  const handleNavigate = () => {
    router.push(`/controls/${rowData.id!}`);
  };

  return (
    <div className="flex w-full p-1">
      <Button
        onClick={handleNavigate}
        disabled={!rowData.id}
        size="sm"
        variant="outline"
        className="w-full"
        title={`View details for ${rowData.name || 'item'}`} // Made title more generic
      >
        View →
      </Button>
    </div>
  );
};
