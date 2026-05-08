'use client';

import { SplitView } from '../_components/SplitView';

interface NewPenetrationTestPageClientProps {
  orgId: string;
}

/**
 * `/penetration-tests/new` — renders the split-view shell in create mode.
 * Shows the run list (dimmed, non-interactive) on the left and the create
 * form in the right pane.
 */
export function NewPenetrationTestPageClient({
  orgId,
}: NewPenetrationTestPageClientProps) {
  return <SplitView orgId={orgId} selectedRunId={null} mode="create" />;
}
