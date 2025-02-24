import { CloudProvider } from "@bubba/db";
import { AppError as ActionAppError } from "./actions/types";

// Re-export types from actions/types.ts for backward compatibility
export type { ActionAppError as AppError };

export interface CloudTestDetails {
  id: string;
  title: string;
  description: string | null;
  provider: CloudProvider;
  status: string;
  config: any;
  authConfig: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  updatedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  runs: {
    id: string;
    status: string;
    result: string | null;
    resultDetails: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    executedBy: {
      id: string;
      name: string | null;
      email: string | null;
    };
    createdAt: Date;
    updatedAt: Date;
  }[];
} 