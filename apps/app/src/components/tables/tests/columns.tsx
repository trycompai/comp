"use client";

import type { CloudProvider } from "@bubba/db";

export interface TestType {
  id: string;
  title: string;
  description: string | null;
  provider: CloudProvider;
  status: string;
  config: Record<string, unknown>;
  authConfig: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  runs?: {
    status: string;
    result: string | null;
    completedAt: Date | null;
  }[];
}

// Note: Column definitions have been moved to data-table.tsx
// This file now only exports the TestType interface
// The actual column definitions are handled by the DataTable component
// which receives server-side translated headers and client-side sorting handlers
