import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFeatureFlags } from '@/app/posthog';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { ISO27001_NAMES } from './isms-types';

interface FrameworkApiResponse {
  data: Array<{ id: string; frameworkId: string; framework: { id: string; name: string } }>;
}

/**
 * PostHog flag gating the ISMS area while it's privately tested. Mirrors
 * `ISMS_FEATURE_FLAG` in DocumentsPageTabs so the routes and the tab stay in
 * lockstep.
 */
const ISMS_FEATURE_FLAG = 'is-isms-enabled';

/**
 * Server-side gate for every `/[orgId]/documents/isms/*` route (wizard +
 * detail pages). The ISMS tab in DocumentsPageTabs is hidden behind the
 * `is-isms-enabled` PostHog flag, but the routes themselves were reachable by
 * direct URL during private testing. This layout enforces the same gate:
 *  - the flag must be enabled for the org (boolean or string "true"), and
 *  - the ISO 27001 framework must be active.
 * Development falls through on the flag check so the area stays visible locally
 * without PostHog configured — identical to DocumentsPageTabs.
 */
export default async function IsmsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect(`/${orgId}/documents`);
  const organizationId = session.session.activeOrganizationId ?? orgId;

  const flags = await getFeatureFlags(session.user.id, {
    groups: { organization: organizationId },
  });
  const ismsFlagEnabled =
    flags[ISMS_FEATURE_FLAG] === true || flags[ISMS_FEATURE_FLAG] === 'true';
  const flagAllowsIsms = ismsFlagEnabled || process.env.NODE_ENV === 'development';

  if (!flagAllowsIsms) redirect(`/${orgId}/documents`);

  // The ISMS area is meaningless without ISO 27001 active — match the same
  // requirement DocumentsPageTabs enforces before showing the tab.
  const frameworksResult = await serverApi.get<FrameworkApiResponse>('/v1/frameworks');
  const frameworks = frameworksResult.data?.data ?? [];
  const hasIso27001 = frameworks.some(
    (instance) => instance.framework?.name && ISO27001_NAMES.includes(instance.framework.name),
  );

  if (!hasIso27001) redirect(`/${orgId}/documents`);

  return <>{children}</>;
}
