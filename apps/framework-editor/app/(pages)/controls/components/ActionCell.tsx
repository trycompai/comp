'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { CellProps } from 'react-datasheet-grid';
import { Button } from '@comp/ui/button';
import type { ControlsPageGridData } from '../types';

export const ActionCell: React.FC<CellProps<ControlsPageGridData, any>> = ({ rowData }) => {
  const router = useRouter();

  if (!rowData || !rowData.id) {
    return null;
  }

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
        className='w-full' 
        title={`View details for ${rowData.name || 'control'}`}
      >
        View →
      </Button>
    </div>
  );
}; 