import {
  DetailMainSkeleton,
  LoadingShell,
} from '../_components/LoadingShell';

/** Detail-route loading state. Mobile shows ONLY the detail-shape main pane. */
export default function Loading() {
  return <LoadingShell variant="detail" mainPane={<DetailMainSkeleton />} />;
}
