'use client';

import { SplitView } from './_components/SplitView';

interface PenetrationTestsPageClientProps {
  orgId: string;
}

/**
 * Penetration tests list route. Renders the split-view shell with no run
 * selected — the right pane shows the Overview. Clicking a row in the left
 * list navigates to `[reportId]` which re-renders the same shell with that
 * run selected.
 */
export function PenetrationTestsPageClient({
  orgId,
}: PenetrationTestsPageClientProps) {
  return <SplitView orgId={orgId} selectedRunId={null} />;
}
