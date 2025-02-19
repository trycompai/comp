"use client";

import type { Departments } from "@bubba/db";

export interface PersonType {
  id: string;
  name: string;
  email: string;
  department: Departments;
  externalEmployeeId?: string;
  isActive: boolean;
}

// Note: Column definitions have been moved to data-table.tsx
// This file now only exports the PersonType interface
// The actual column definitions are handled by the DataTable component
// which receives server-side translated headers and client-side sorting handlers
