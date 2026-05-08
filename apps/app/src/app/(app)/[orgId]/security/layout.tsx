import { requireRoutePermission } from '@/lib/permissions.server';

export default async function SecurityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Access is gated solely by the `pentest:read` permission
  // (via `requireRoutePermission`), which already redirects
  // unauthenticated/unauthorized users. The previous
  // `is-security-enabled` PostHog flag was kept from a staged-rollout
  // era and added a second 404 path that broke local dev whenever
  // PostHog couldn't return the flag.
  await requireRoutePermission('penetration-tests', orgId);

  return <>{children}</>;
}
