'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

interface TimelinePhase {
  id: string;
  name: string;
  description: string | null;
  groupLabel?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  durationWeeks: number;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  completionType:
    | 'AUTO_TASKS'
    | 'AUTO_POLICIES'
    | 'AUTO_PEOPLE'
    | 'AUTO_FINDINGS'
    | 'AUTO_UPLOAD'
    | 'MANUAL';
  completionPercent?: number;
  readyForReview: boolean;
  readyForReviewAt: string | null;
}

interface Timeline {
  id: string;
  organizationId: string;
  frameworkInstanceId: string;
  templateId: string;
  cycleNumber: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startDate: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  phases: TimelinePhase[];
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
    cycleNumber: number;
  };
}

interface TimelinesApiResponse {
  data: Timeline[];
  count: number;
}

export const timelinesKey = () => ['/v1/timelines'] as const;
export const timelineKey = (id: string) => ['/v1/timelines', id] as const;

interface UseTimelinesOptions {
  initialData?: Timeline[];
}

export function useTimelines(options?: UseTimelinesOptions) {
  const { initialData } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    timelinesKey(),
    async () => {
      const response =
        await apiClient.get<TimelinesApiResponse>('/v1/timelines');
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) return [];
      return response.data.data;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
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

export function useTimeline(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? timelineKey(id) : null,
    async () => {
      const response = await apiClient.get<Timeline>(
        `/v1/timelines/${id}`,
      );
      if (response.error) throw new Error(response.error);
      return response.data ?? null;
    },
    {
      revalidateOnFocus: false,
    },
  );

  return {
    timeline: data ?? null,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}

export async function markPhaseReadyForReview({
  timelineId,
  phaseId,
}: {
  timelineId: string;
  phaseId: string;
}) {
  const response = await apiClient.post(
    `/v1/timelines/${timelineId}/phases/${phaseId}/ready`,
  );
  if (response.error) throw new Error(response.error);
  return response.data;
}

export type { Timeline, TimelinePhase };
