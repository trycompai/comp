'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

interface AdminTimelinePhaseTemplate {
  id: string;
  name: string;
  description: string | null;
  groupLabel?: string | null;
  defaultDurationWeeks: number;
  orderIndex: number;
  completionType:
    | 'AUTO_TASKS'
    | 'AUTO_POLICIES'
    | 'AUTO_PEOPLE'
    | 'AUTO_FINDINGS'
    | 'AUTO_UPLOAD'
    | 'MANUAL';
  locksTimelineOnComplete: boolean;
}

interface AdminTimelineTemplate {
  id: string;
  frameworkId: string;
  trackKey?: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  cycleNumber: number;
  createdAt: string;
  updatedAt: string;
  phases: AdminTimelinePhaseTemplate[];
  framework?: {
    id: string;
    name: string;
    visible?: boolean;
  };
}

interface AdminTimelineTemplatesApiResponse {
  data: AdminTimelineTemplate[];
  count: number;
}

interface AdminOrgTimeline {
  id: string;
  organizationId: string;
  frameworkInstanceId: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startDate: string;
  estimatedEndDate: string;
  lockedAt: string | null;
  lockedById: string | null;
  unlockedAt: string | null;
  unlockedById: string | null;
  unlockReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  phases: {
    id: string;
    name: string;
    description: string | null;
    groupLabel?: string | null;
    completionType:
      | 'AUTO_TASKS'
      | 'AUTO_POLICIES'
      | 'AUTO_PEOPLE'
      | 'AUTO_FINDINGS'
      | 'AUTO_UPLOAD'
      | 'MANUAL';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    durationWeeks: number;
    orderIndex: number;
    startDate: string | null;
    endDate: string | null;
    completedAt: string | null;
    locksTimelineOnComplete: boolean;
    regressedAt?: string | null;
  }[];
  frameworkInstance?: {
    id: string;
    framework: {
      id: string;
      name: string;
    };
  };
  template?: {
    id: string;
    name: string;
  };
}

interface AdminOrgTimelinesApiResponse {
  data: AdminOrgTimeline[];
  count: number;
}

export const adminTimelineTemplatesKey = () =>
  ['/v1/admin/timeline-templates'] as const;

export const adminTimelineTemplateKey = (id: string) =>
  ['/v1/admin/timeline-templates', id] as const;

export const adminOrgTimelinesKey = (orgId: string) =>
  ['/v1/admin/organizations', orgId, 'timelines'] as const;

export function useAdminTimelineTemplates() {
  const { data, error, isLoading, mutate } = useSWR(
    adminTimelineTemplatesKey(),
    async () => {
      const response =
        await apiClient.get<AdminTimelineTemplatesApiResponse>(
          '/v1/admin/timeline-templates',
        );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) return [];
      return response.data.data;
    },
    {
      revalidateOnFocus: false,
    },
  );

  const templates = Array.isArray(data) ? data : [];

  return {
    templates,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

export function useAdminTimelineTemplate(templateId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    templateId ? adminTimelineTemplateKey(templateId) : null,
    async () => {
      const response = await apiClient.get<AdminTimelineTemplate>(
        `/v1/admin/timeline-templates/${templateId}`,
      );
      if (response.error) throw new Error(response.error);
      if (!response.data) return null;
      return response.data;
    },
    {
      revalidateOnFocus: false,
    },
  );

  return {
    template: data ?? null,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

export function useAdminOrgTimelines(orgId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? adminOrgTimelinesKey(orgId) : null,
    async () => {
      const response =
        await apiClient.get<AdminOrgTimelinesApiResponse>(
          `/v1/admin/organizations/${orgId}/timelines`,
        );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) return [];
      return response.data.data;
    },
    {
      revalidateOnFocus: false,
    },
  );

  const timelines = Array.isArray(data) ? data : [];

  return {
    timelines,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

export type {
  AdminTimelineTemplate,
  AdminTimelinePhaseTemplate,
  AdminOrgTimeline,
};
