'use client';

import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  frequency: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

export function useTaskTemplates(options: UseApiSWROptions<TaskTemplate[]> = {}) {
  return useApiSWR<TaskTemplate[]>('/v1/framework-editor/task-template', options);
}
