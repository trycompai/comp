'use client';

import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useServerFeatureFlags } from '../components/server-feature-flags-provider';

/**
 * Returns whether a feature flag is enabled for the current user/group.
 *
 * The flag is on when EITHER source says so:
 * - the live posthog-js value (fresh while the browser can reach PostHog), or
 * - flags evaluated server-side and passed down via ServerFeatureFlagsProvider.
 *
 * The OR matters: when the client's flags request is blocked (ad blockers,
 * privacy browsers, corporate proxies) the live value is `undefined` forever —
 * or worse, a stale `false` persisted from an old session — and only the
 * server-evaluated value can turn the feature on. Mirrors PostHog "enabled"
 * semantics: `true` or any non-empty variant string counts as enabled.
 */
export function useFeatureFlag(flagKey: string): boolean {
  const liveValue = useFeatureFlagEnabled(flagKey);
  const serverFlags = useServerFeatureFlags();
  const serverValue = serverFlags?.[flagKey];

  return (
    liveValue === true ||
    serverValue === true ||
    (typeof serverValue === 'string' && serverValue.length > 0)
  );
}
