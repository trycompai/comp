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

export interface TaskTemplateListResponse {
  data: TaskTemplate[];
  count: number;
}

export function useTaskTemplates(options: UseApiSWROptions<TaskTemplateListResponse> = {}) {
  return useApiSWR<TaskTemplateListResponse>('/v1/tasks/templates', options);
}
