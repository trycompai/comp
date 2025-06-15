import type { FrameworkEditorControlTemplate } from "@prisma/client";
// Import shared types from the common location
import type { SortDirection, SortableColumnOption } from "../../types/common";

// Basic item with id and name
export interface ItemWithName {
  id: string;
  name: string;
}

// Define a more specific type for requirement items that can include framework info
export interface RequirementItemWithFramework extends ItemWithName {
  framework?: {
    name: string;
  };
}

export interface RequirementGridItem extends ItemWithName {
  frameworkName?: string;
}

// Base type for data from the server with potential related entities
export interface FrameworkEditorControlTemplateWithRelatedData
  extends FrameworkEditorControlTemplate {
  policyTemplates?: ItemWithName[];
  requirements?: RequirementItemWithFramework[];
  taskTemplates?: ItemWithName[];
}

// Specific structure for the data displayed in the Controls page grid
export type ControlsPageGridData = {
  id: string;
  name: string | null;
  description: string | null;
  // Store the actual arrays of related items
  policyTemplates: ItemWithName[];
  requirements: RequirementGridItem[];
  taskTemplates: ItemWithName[];
  // Add separate fields for sorting by count
  policyTemplatesLength: number;
  requirementsLength: number;
  taskTemplatesLength: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

// react-datasheet-grid operation type
export type DSGOperation =
  | { type: "CREATE"; fromRowIndex: number; toRowIndex: number }
  | { type: "UPDATE"; fromRowIndex: number; toRowIndex: number }
  | { type: "DELETE"; fromRowIndex: number; toRowIndex: number };

// General types for sorting and toolbar options are now imported
// export type SortDirection = 'asc' | 'desc'; // Moved to common.ts

// Specific sortable column keys for the Controls page table
export type ControlsPageSortableColumnKey =
  | "name"
  | "description"
  // Update to use length fields for sorting
  | "policyTemplatesLength"
  | "requirementsLength"
  | "taskTemplatesLength"
  | "createdAt"
  | "updatedAt";

// Generic type for options in the sort dropdown for the toolbar is now imported
// export interface SortableColumnOption { // Moved to common.ts
//   value: string;
//   label: string;
// }

// Re-export for convenience if ControlsClientPage needs them directly from this file
export type { SortDirection, SortableColumnOption };
