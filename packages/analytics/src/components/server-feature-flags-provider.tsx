'use client';

import { createContext, useContext } from 'react';

export type ServerFeatureFlags = Record<string, string | boolean>;

const ServerFeatureFlagsContext = createContext<ServerFeatureFlags | null>(null);

/**
 * Provides feature flags evaluated server-side (posthog-node) as a fallback
 * for `useFeatureFlag`. The client-side posthog-js flags request is routinely
 * blocked by ad blockers / privacy browsers / corporate proxies — without this
 * fallback, flag-gated UI silently never renders for those users.
 */
export function ServerFeatureFlagsProvider({
  flags,
  children,
}: {
  flags: ServerFeatureFlags;
  children: React.ReactNode;
}) {
  return (
    <ServerFeatureFlagsContext.Provider value={flags}>
      {children}
    </ServerFeatureFlagsContext.Provider>
  );
}

export function useServerFeatureFlags(): ServerFeatureFlags | null {
  return useContext(ServerFeatureFlagsContext);
}
