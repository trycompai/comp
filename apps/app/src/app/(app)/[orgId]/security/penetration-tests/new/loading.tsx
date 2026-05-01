import {
  CreateMainSkeleton,
  LoadingShell,
} from '../_components/LoadingShell';

/** Create-route loading state. Mobile shows ONLY the create-form skeleton. */
export default function Loading() {
  return <LoadingShell variant="create" mainPane={<CreateMainSkeleton />} />;
}
