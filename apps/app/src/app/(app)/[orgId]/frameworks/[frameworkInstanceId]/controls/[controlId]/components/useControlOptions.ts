'use client';

import { useApiSWR } from '@/hooks/use-api-swr';

interface PolicyOption {
  id: string;
  name: string;
}

interface TaskOption {
  id: string;
  title: string;
}

interface RequirementOption {
  id: string;
  name: string;
  identifier: string;
  frameworkInstanceId: string;
  frameworkName: string;
  requirementId?: string;
  customRequirementId?: string;
  isCustom: boolean;
}

interface ControlOptionsResponse {
  policies: PolicyOption[];
  tasks: TaskOption[];
  requirements: RequirementOption[];
}

export function useControlOptions(enabled: boolean) {
  const { data, isLoading, mutate } = useApiSWR<ControlOptionsResponse>(
    '/v1/controls/options',
    { enabled },
  );

  const options = data?.data;

  return {
    policies: options?.policies ?? [],
    tasks: options?.tasks ?? [],
    requirements: options?.requirements ?? [],
    isLoading,
    mutate,
  };
}
