"use client";

export interface TestType {
  id: string;
  severity: string | null;
  result: string;
  title: string;
  provider: string;
  createdAt: Date;
  assignedUser: null;
}


// Note: Column definitions have been moved to data-table.tsx
// This file now only exports the TestType interface
// The actual column definitions are handled by the DataTable component
// which receives server-side translated headers and client-side sorting handlers
