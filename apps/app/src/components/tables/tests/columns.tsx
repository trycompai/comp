"use client";

import type { CloudProvider } from "@bubba/db";

export interface TestType {
  id: string;
  title: string;
  description: string | null;
  provider: string;
  status: string;
  resultDetails: any;
  label: string | null;
  assignedUserId: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

// Note: Column definitions have been moved to data-table.tsx
// This file now only exports the TestType interface
// The actual column definitions are handled by the DataTable component
// which receives server-side translated headers and client-side sorting handlers
