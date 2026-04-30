'use client';

import { SplitView } from '../_components/SplitView';

interface PenetrationTestPageClientProps {
  orgId: string;
  reportId: string;
}

/**
 * Penetration test detail route. Renders the same split-view shell as the
 * list page but with `selectedRunId` set, so the right pane picks the
 * appropriate detail variant (running / completed / clean / failed).
 */
export function PenetrationTestPageClient({
  orgId,
  reportId,
}: PenetrationTestPageClientProps) {
  return <SplitView orgId={orgId} selectedRunId={reportId} />;
}
