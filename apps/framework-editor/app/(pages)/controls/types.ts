import type { FrameworkEditorControlTemplate } from '@prisma/client';
// Import shared types from the common location
import type { SortDirection, SortableColumnOption } from '../../types/common'; 

// Base type for data from the server with potential related entities
export interface FrameworkEditorControlTemplateWithRelatedData extends FrameworkEditorControlTemplate {
  policyTemplates?: { id: string; name: string }[];
  requirements?: { id: string; name: string }[];
  taskTemplates?: { id: string; name: string }[];
}

// Specific structure for the data displayed in the Controls page grid
export type ControlsPageGridData = {
  id: string;
  name: string | null;
  description: string | null;
  // Store the actual arrays of related items
  policyTemplates: { id: string; name: string }[];
  requirements: { id: string; name: string }[];
  taskTemplates: { id: string; name: string }[];
  // Add separate fields for sorting by count
  policyTemplatesLength: number;
  requirementsLength: number;
  taskTemplatesLength: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

// react-datasheet-grid operation type
export type DSGOperation = 
  | { type: 'CREATE'; fromRowIndex: number; toRowIndex: number }
  | { type: 'UPDATE'; fromRowIndex: number; toRowIndex: number }
  | { type: 'DELETE'; fromRowIndex: number; toRowIndex: number };

// General types for sorting and toolbar options are now imported
// export type SortDirection = 'asc' | 'desc'; // Moved to common.ts

// Specific sortable column keys for the Controls page table
export type ControlsPageSortableColumnKey = 
  | 'name' 
  | 'description' 
  // Update to use length fields for sorting
  | 'policyTemplatesLength' 
  | 'requirementsLength' 
  | 'taskTemplatesLength'
  | 'createdAt'
  | 'updatedAt';

// Generic type for options in the sort dropdown for the toolbar is now imported
// export interface SortableColumnOption { // Moved to common.ts
//   value: string; 
//   label: string;
// }

// Re-export for convenience if ControlsClientPage needs them directly from this file
export type { SortDirection, SortableColumnOption }; 