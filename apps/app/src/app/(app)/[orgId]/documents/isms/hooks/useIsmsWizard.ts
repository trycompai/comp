'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api-client';
import type {
  PartialWizardAnswers,
  SaveProfileResponse,
  WizardProfileResponse,
} from '../wizard/wizard-types';

interface UseIsmsWizardOptions {
  organizationId: string;
  frameworkId: string;
  fallbackData?: WizardProfileResponse | null;
}

function buildKey(
  organizationId: string,
  frameworkId: string | null,
): readonly [string, string] | null {
  if (!frameworkId) return null;
  return [`/v1/isms/profile?frameworkId=${encodeURIComponent(frameworkId)}`, organizationId] as const;
}

async function unwrap<T>(
  promise: Promise<{ data?: T; error?: string }>,
  fallbackError: string,
): Promise<T> {
  const response = await promise;
  if (response.error || !response.data) {
    throw new Error(response.error ?? fallbackError);
  }
  return response.data;
}

/**
 * Data + mutations for the ISMS setup wizard (CS-438).
 *   - SWR for GET /v1/isms/profile (seeded with the server-fetched fallback).
 *   - saveAnswers: partial POST /v1/isms/profile (per-step progress).
 *   - complete: full POST /v1/isms/profile { complete: true }.
 *   - generateAll: POST /v1/isms/generate-all (run on completion).
 */
export function useIsmsWizard({
  organizationId,
  frameworkId,
  fallbackData,
}: UseIsmsWizardOptions) {
  const { data, error, isLoading, mutate } = useSWR<WizardProfileResponse>(
    buildKey(organizationId, frameworkId),
    async ([key]: readonly [string, string]) =>
      unwrap<WizardProfileResponse>(
        api.get<WizardProfileResponse>(key, organizationId),
        'Failed to load wizard profile',
      ),
    {
      fallbackData: fallbackData ?? undefined,
      revalidateOnMount: !fallbackData,
      revalidateOnFocus: false,
    },
  );

  // Seed the SWR cache with fallbackData so mutate() updaters work correctly.
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && fallbackData) {
      seeded.current = true;
      void mutate(fallbackData, false);
    }
  }, [fallbackData, mutate]);

  const saveAnswers = async (answers: PartialWizardAnswers): Promise<SaveProfileResponse> => {
    const result = await unwrap<SaveProfileResponse>(
      api.post<SaveProfileResponse>('/v1/isms/profile', { frameworkId, answers }, organizationId),
      'Failed to save answers',
    );
    await mutate(
      (current) => (current ? { ...current, answers: result.answers } : current),
      false,
    );
    return result;
  };

  const complete = async (answers: PartialWizardAnswers): Promise<SaveProfileResponse> => {
    const result = await unwrap<SaveProfileResponse>(
      api.post<SaveProfileResponse>(
        '/v1/isms/profile',
        { frameworkId, answers, complete: true },
        organizationId,
      ),
      'Failed to complete the wizard',
    );
    await mutate(
      (current) => (current ? { ...current, answers: result.answers } : current),
      false,
    );
    return result;
  };

  const generateAll = async (): Promise<void> => {
    await unwrap(
      api.post('/v1/isms/generate-all', { frameworkId }, organizationId),
      'Failed to generate ISMS documents',
    );
  };

  return {
    profile: data ?? null,
    error,
    isLoading,
    mutate,
    saveAnswers,
    complete,
    generateAll,
  };
}
