'use client';

import { api } from '@/lib/api-client';
import type {
  CreatePenetrationTestResponse,
  PentestCreateRequest,
  PentestProgress,
  PentestReportStatus,
  PentestRun,
} from '@/lib/security/penetration-tests-client';
import { useCallback, useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import useSWR from 'swr';
import { isReportInProgress, sortReportsByUpdatedAtDesc } from '../lib';

const reportListEndpoint = '/v1/security-penetration-tests';
const githubReposEndpoint = '/v1/security-penetration-tests/github/repos';
const reportEndpoint = (reportId: string): string =>
  `/v1/security-penetration-tests/${encodeURIComponent(reportId)}`;
const reportProgressEndpoint = (reportId: string): string =>
  `/v1/security-penetration-tests/${encodeURIComponent(reportId)}/progress`;
const inProgressStatus: readonly PentestReportStatus[] = [
  'provisioning',
  'cloning',
  'running',
];
const allStatuses: readonly PentestReportStatus[] = [
  'provisioning',
  'cloning',
  'running',
  'completed',
  'failed',
  'cancelled',
];

type ReportsSWRKey = readonly [endpoint: string, organizationId: string];

const githubReposKey = (organizationId: string): ReportsSWRKey =>
  [githubReposEndpoint, organizationId] as const;
const reportListKey = (organizationId: string): ReportsSWRKey =>
  [reportListEndpoint, organizationId] as const;
const reportKey = (organizationId: string, reportId: string): ReportsSWRKey =>
  [reportEndpoint(reportId), organizationId] as const;
const reportProgressKey = (
  organizationId: string,
  reportId: string,
): ReportsSWRKey => [reportProgressEndpoint(reportId), organizationId] as const;

async function fetchApiJson<T>([endpoint, organizationId]: ReportsSWRKey): Promise<T> {
  const response = await api.get<T>(endpoint, organizationId);

  if (response.status < 200 || response.status >= 300) {
    throw new Error(response.error ?? `Request failed with status ${response.status}`);
  }

  return (response.data ?? null) as T;
}

const resolveCreateStatus = (
  status: string | undefined,
): PentestReportStatus => {
  if (!status) {
    return 'provisioning';
  }

  return (allStatuses as readonly string[]).includes(status)
    ? (status as PentestReportStatus)
    : 'provisioning';
};

interface CreatePayload {
  targetUrl: string;
  repoUrl?: string;
  githubToken?: string;
  configYaml?: string;
  pipelineTesting?: boolean;
  testMode?: boolean;
  workspace?: string;
}

type CreateReportApiPayload = PentestCreateRequest;

interface UsePenetrationTestsReturn {
  reports: PentestRun[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<PentestRun[] | undefined>;
  activeReports: PentestRun[];
  completedReports: PentestRun[];
}

interface UsePenetrationTestReturn {
  report: PentestRun | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<PentestRun | undefined>;
}

interface UsePenetrationTestProgressReturn {
  progress: PentestProgress | null | undefined;
  isLoading: boolean;
}

interface UseCreatePenetrationTestReturn {
  createReport: (payload: CreatePayload) => Promise<CreatePenetrationTestResponse>;
  isCreating: boolean;
  error: string | null;
  resetError: () => void;
}

export function usePenetrationTests(
  organizationId: string,
): UsePenetrationTestsReturn {
  const shouldFetchReports = Boolean(organizationId);
  const { data, error, mutate } = useSWR<PentestRun[]>(
    shouldFetchReports ? reportListKey(organizationId) : null,
    fetchApiJson,
    {
      refreshInterval: (latestReports?: PentestRun[]) => {
        if (!latestReports?.some(({ status }) => isReportInProgress(status))) {
          return 0;
        }

        return 4000;
      },
      revalidateOnFocus: true,
    },
  );

  const reports = useMemo(() => sortReportsByUpdatedAtDesc(data ?? []), [data]);
  const activeReports = useMemo(
    () => reports.filter(({ status }) => isReportInProgress(status)),
    [reports],
  );
  const completedReports = useMemo(
    () => reports.filter(({ status }) => !isReportInProgress(status)),
    [reports],
  );

  return {
    reports,
    isLoading: shouldFetchReports && data === undefined && !error,
    error: error as Error | undefined,
    mutate,
    activeReports,
    completedReports,
  };
}

export function usePenetrationTest(
  organizationId: string,
  reportId: string,
): UsePenetrationTestReturn {
  const shouldFetchReport = Boolean(organizationId && reportId);
  const { data, error, mutate } = useSWR<PentestRun>(
    shouldFetchReport ? reportKey(organizationId, reportId) : null,
    fetchApiJson,
    {
      refreshInterval: (latestReport?: PentestRun) => {
        if (!latestReport || !isReportInProgress(latestReport.status)) {
          return 0;
        }

        return 4000;
      },
      revalidateOnFocus: true,
    },
  );

  return {
    report: data,
    isLoading: shouldFetchReport && data === undefined && !error,
    error: error as Error | undefined,
    mutate,
  };
}

export function usePenetrationTestProgress(
  organizationId: string,
  reportId: string,
  status: PentestReportStatus | undefined,
) {
  const shouldFetch = Boolean(
    organizationId && reportId && status && isReportInProgress(status),
  );

  const { data } = useSWR<PentestProgress>(
    shouldFetch ? reportProgressKey(organizationId, reportId) : null,
    fetchApiJson,
    {
      refreshInterval: shouldFetch ? 4000 : 0,
      revalidateOnFocus: true,
    },
  );

  return {
    progress: data,
    isLoading: shouldFetch && data === undefined,
  } satisfies UsePenetrationTestProgressReturn;
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
}

interface GithubReposResponse {
  repos: GithubRepo[];
  connected: boolean;
}

export function useGithubRepos(organizationId: string): {
  repos: GithubRepo[];
  connected: boolean;
  isLoading: boolean;
} {
  const shouldFetch = Boolean(organizationId);
  const { data } = useSWR<GithubReposResponse>(
    shouldFetch ? githubReposKey(organizationId) : null,
    fetchApiJson,
  );

  return {
    repos: data?.repos ?? [],
    connected: data?.connected ?? false,
    isLoading: shouldFetch && data === undefined,
  };
}

export function useCreatePenetrationTest(
  organizationId: string,
): UseCreatePenetrationTestReturn {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReport = useCallback(
    async (payload: CreatePayload): Promise<CreatePenetrationTestResponse> => {
      setIsCreating(true);
      setError(null);
      try {
        const response = await api.post<{
          id?: string;
          status?: PentestReportStatus;
        }>(
          reportListEndpoint,
          {
            targetUrl: payload.targetUrl,
            repoUrl: payload.repoUrl,
            githubToken: payload.githubToken,
            configYaml: payload.configYaml,
            pipelineTesting: payload.pipelineTesting,
            testMode: payload.testMode,
            workspace: payload.workspace,
          } satisfies CreateReportApiPayload,
          organizationId,
        );

        if (response.status < 200 || response.status >= 300) {
          throw new Error(response.error ?? `Request failed with status ${response.status}`);
        }

        const reportId = response.data?.id;
        if (!reportId) {
          throw new Error('Could not resolve report ID from create response.');
        }

        const billingRes = await api.post(
          '/v1/pentest-billing/charge',
          { runId: reportId },
          organizationId,
        );
        if (billingRes.error) {
          throw new Error(billingRes.error);
        }

        const data: CreatePenetrationTestResponse = {
          id: reportId,
          status: response.data?.status,
        };

        const now = new Date().toISOString();
        const optimisticReport: PentestRun = {
          id: reportId,
          targetUrl: payload.targetUrl,
          repoUrl: payload.repoUrl ?? null,
          status: resolveCreateStatus(response.data?.status),
          testMode: payload.testMode ?? null,
          createdAt: now,
          updatedAt: now,
          error: null,
          failedReason: null,
          temporalUiUrl: null,
          webhookUrl: null,
        };

        setIsCreating(false);
        try {
          await mutate(
            reportListKey(organizationId),
            (currentReports?: PentestRun[]) => {
              const nextReports = currentReports ?? [];
              const dedupedReports = nextReports.filter(({ id }) => id !== reportId);
              return sortReportsByUpdatedAtDesc([optimisticReport, ...dedupedReports]);
            },
            { revalidate: false },
          );
          await mutate(
            reportKey(organizationId, reportId),
            optimisticReport,
            { revalidate: false },
          );
        } catch (cacheMutationError) {
          console.error(
            'Created penetration test but failed to optimistically update report cache',
            cacheMutationError,
          );
        }
        void mutate(reportListKey(organizationId));
        void mutate(reportKey(organizationId, reportId));
        return data;
      } catch (reportError) {
        const message =
          reportError instanceof Error
            ? reportError.message
            : 'Failed to create report';
        setError(message);
        setIsCreating(false);
        throw new Error(message);
      }
    },
    [organizationId, mutate],
  );

  return {
    createReport,
    isCreating,
    error,
    resetError: () => setError(null),
  };
}
