'use client';

import { api } from '@/lib/api-client';
import type {
  CreatePenetrationTestResponse,
  PentestAgentEvent,
  PentestCreateRequest,
  PentestIssue,
  PentestProgress,
  PentestReportStatus,
  PentestRun,
} from '@/lib/security/penetration-tests-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { isReportInProgress, sortReportsByUpdatedAtDesc } from '../lib';

const reportListEndpoint = '/v1/security-penetration-tests';
const creditsStatusEndpoint = '/v1/pentest-credits/status';
const reportEndpoint = (reportId: string): string =>
  `/v1/security-penetration-tests/${encodeURIComponent(reportId)}`;
const reportProgressEndpoint = (reportId: string): string =>
  `/v1/security-penetration-tests/${encodeURIComponent(reportId)}/progress`;
const reportIssuesEndpoint = (reportId: string): string =>
  `/v1/security-penetration-tests/${encodeURIComponent(reportId)}/issues`;
const reportEventsEndpoint = (reportId: string): string =>
  `/v1/security-penetration-tests/${encodeURIComponent(reportId)}/events`;
const inProgressStatus: readonly PentestReportStatus[] = ['provisioning', 'cloning', 'running'];
const allStatuses: readonly PentestReportStatus[] = [
  'provisioning',
  'cloning',
  'running',
  'completed',
  'failed',
  'cancelled',
];

type ReportsSWRKey = readonly [endpoint: string, organizationId: string];

const reportListKey = (organizationId: string): ReportsSWRKey =>
  [reportListEndpoint, organizationId] as const;
const reportKey = (organizationId: string, reportId: string): ReportsSWRKey =>
  [reportEndpoint(reportId), organizationId] as const;
const reportProgressKey = (organizationId: string, reportId: string): ReportsSWRKey =>
  [reportProgressEndpoint(reportId), organizationId] as const;

async function fetchApiJson<T>([endpoint, organizationId]: ReportsSWRKey): Promise<T> {
  const response = await api.get<T>(endpoint, organizationId);

  if (response.status < 200 || response.status >= 300) {
    throw new Error(response.error ?? `Request failed with status ${response.status}`);
  }

  return (response.data ?? null) as T;
}

const resolveCreateStatus = (status: string | undefined): PentestReportStatus => {
  if (!status) {
    return 'provisioning';
  }

  return (allStatuses as readonly string[]).includes(status)
    ? (status as PentestReportStatus)
    : 'provisioning';
};

type CreatePayload = PentestCreateRequest;

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

export function usePenetrationTests(organizationId: string): UsePenetrationTestsReturn {
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
  const shouldFetch = Boolean(organizationId && reportId && status && isReportInProgress(status));

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

const reportIssuesKey = (organizationId: string, reportId: string): ReportsSWRKey =>
  [reportIssuesEndpoint(reportId), organizationId] as const;

const reportEventsKey = (organizationId: string, reportId: string): ReportsSWRKey =>
  [reportEventsEndpoint(reportId), organizationId] as const;

// Polls the issues list continuously while the run is in-progress, and once
// after completion to load the final set. During a live ~1-hr scan, findings
// trickle in — each refresh appends any new ones.
export function usePenetrationTestIssues(
  organizationId: string,
  reportId: string,
  status: PentestReportStatus | undefined,
): {
  issues: PentestIssue[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<PentestIssue[] | undefined>;
} {
  const shouldFetch = Boolean(organizationId && reportId);
  const inProgress = Boolean(status && isReportInProgress(status));

  const { data, error, mutate } = useSWR<PentestIssue[]>(
    shouldFetch ? reportIssuesKey(organizationId, reportId) : null,
    fetchApiJson,
    {
      refreshInterval: inProgress ? 3000 : 0,
      revalidateOnFocus: true,
    },
  );

  // Trigger one final fetch the moment the run transitions out of an
  // in-progress state. Without this, the very last batch of findings
  // Maced writes during the completion phase can be missed: we stop
  // polling immediately and don't refresh again until the user
  // refocuses the tab.
  const wasInProgressRef = useRef(inProgress);
  useEffect(() => {
    if (wasInProgressRef.current && !inProgress && shouldFetch) {
      void mutate();
    }
    wasInProgressRef.current = inProgress;
  }, [inProgress, shouldFetch, mutate]);

  return {
    issues: data ?? [],
    isLoading: shouldFetch && data === undefined && !error,
    error: error as Error | undefined,
    mutate,
  };
}

// Polls the agent event stream (tool calls, observations). Noisier than
// issues — intended for activity feeds or debug views.
export function usePenetrationTestEvents(
  organizationId: string,
  reportId: string,
  status: PentestReportStatus | undefined,
): {
  events: PentestAgentEvent[];
  isLoading: boolean;
} {
  const shouldFetch = Boolean(organizationId && reportId);
  const inProgress = Boolean(status && isReportInProgress(status));

  const { data, error, mutate } = useSWR<PentestAgentEvent[]>(
    shouldFetch ? reportEventsKey(organizationId, reportId) : null,
    fetchApiJson,
    {
      refreshInterval: inProgress ? 5000 : 0,
      revalidateOnFocus: true,
    },
  );

  // Same final-refresh pattern as usePenetrationTestIssues — when the
  // run transitions out of in-progress we poll one more time so the
  // last batch of events Maced wrote during the completion phase isn't
  // missed (otherwise we'd stop polling immediately and never see them
  // unless the user refocuses the tab).
  const wasInProgressRef = useRef(inProgress);
  useEffect(() => {
    if (wasInProgressRef.current && !inProgress && shouldFetch) {
      void mutate();
    }
    wasInProgressRef.current = inProgress;
  }, [inProgress, shouldFetch, mutate]);

  return {
    events: data ?? [],
    isLoading: shouldFetch && data === undefined && !error,
  };
}

export interface PentestCreditsStatus {
  balance: number;
  totalGranted: number;
  totalConsumed: number;
  lastGrantSource: string;
}

const creditsKey = (organizationId: string): ReportsSWRKey =>
  [creditsStatusEndpoint, organizationId] as const;

/**
 * Wallet status for the org. Drives the "X runs remaining" badge in the
 * RunList header and gates the "+ New" button. Re-fetched after each
 * successful create via SWR's `mutate(creditsKey(...))`.
 */
export function usePentestCredits(organizationId: string): {
  credits: PentestCreditsStatus | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<PentestCreditsStatus | undefined>;
} {
  const shouldFetch = Boolean(organizationId);
  const { data, error, mutate } = useSWR<PentestCreditsStatus>(
    shouldFetch ? creditsKey(organizationId) : null,
    fetchApiJson,
    { revalidateOnFocus: true },
  );

  return {
    credits: data,
    isLoading: shouldFetch && data === undefined && !error,
    error: error as Error | undefined,
    mutate,
  };
}

export function useCreatePenetrationTest(organizationId: string): UseCreatePenetrationTestReturn {
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
            pipelineTesting: payload.pipelineTesting,
            testMode: payload.testMode,
            scanDepth: payload.scanDepth,
            evidenceLevel: payload.evidenceLevel,
            checks: payload.checks,
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
          scanDepth: payload.scanDepth,
          evidenceLevel: payload.evidenceLevel,
          checks: payload.checks,
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
          await mutate(reportKey(organizationId, reportId), optimisticReport, {
            revalidate: false,
          });
        } catch (cacheMutationError) {
          console.error(
            'Created penetration test but failed to optimistically update report cache',
            cacheMutationError,
          );
        }
        void mutate(reportListKey(organizationId));
        void mutate(reportKey(organizationId, reportId));
        // Balance changed — kick the credits cache so the badge and the
        // "+ New" gating reflect the new balance immediately.
        void mutate(creditsKey(organizationId));
        return data;
      } catch (reportError) {
        const message =
          reportError instanceof Error ? reportError.message : 'Failed to create report';
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
