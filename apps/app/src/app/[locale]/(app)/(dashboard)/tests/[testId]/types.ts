import { CloudProvider } from "@bubba/db";
import { AppError as ActionAppError } from "./actions/types";

// Re-export types from actions/types.ts for backward compatibility
export type { ActionAppError as AppError };

export interface CloudTestDetails {
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