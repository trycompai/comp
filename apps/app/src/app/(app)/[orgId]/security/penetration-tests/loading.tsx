import {
  LoadingShell,
  OverviewMainSkeleton,
} from './_components/LoadingShell';

/**
 * List-route loading state. Mobile shows ONLY the sidebar skeleton (this
 * URL resolves into a full-width list); desktop shows the full split
 * shell. The `[reportId]/loading.tsx` and `new/loading.tsx` siblings
 * override this for nested routes so each variant's mobile skeleton
 * matches its resolving page.
 */
export default function Loading() {
  return <LoadingShell variant="list" mainPane={<OverviewMainSkeleton />} />;
}
