'use client';

import { type ReactNode } from 'react';

/**
 * @deprecated NuqsWrapper is no longer needed. Use React useState for UI state.
 * Kept as a passthrough to avoid breaking existing imports.
 */
export function NuqsWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
