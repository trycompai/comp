'use client';

import { useFeatureFlagEnabled } from 'posthog-js/react';

/**
 * Returns whether a feature flag is enabled for the current user/group.
 * Thin wrapper around posthog-js's reactive hook. Returns false until flags
 * finish loading — callers should treat the flag as the source of truth, and
 * create + toggle the flag via the admin UI (or PostHog) to enable features
 * locally.
 */
export function useFeatureFlag(flagKey: string): boolean {
  return useFeatureFlagEnabled(flagKey) === true;
}
