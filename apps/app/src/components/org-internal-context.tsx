'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Whether the current organization is platform-operated ("internal", e.g. Comp
 * AI's own org). Internal orgs treat platform admins as real members, so UI that
 * normally hides platform admins (e.g. assignee pickers) shows them here.
 *
 * Defaults to `false` outside a provider — the safe customer-org behavior.
 */
const OrgIsInternalContext = createContext<boolean>(false);

export function OrgInternalProvider({
  isInternal,
  children,
}: {
  isInternal: boolean;
  children: ReactNode;
}) {
  return (
    <OrgIsInternalContext.Provider value={isInternal}>{children}</OrgIsInternalContext.Provider>
  );
}

export function useOrgIsInternal(): boolean {
  return useContext(OrgIsInternalContext);
}
