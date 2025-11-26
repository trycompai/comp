import { getFeatureFlags } from '@/app/posthog';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { db } from '@db';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { orgId } = await params;

  // Check if organization has ISO 27001 framework and feature flag
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  let hasISO27001 = false;
  let isSOAFeatureEnabled = false;

  if (session?.session?.activeOrganizationId === orgId && session?.user?.id) {
    // Check feature flag
    const flags = await getFeatureFlags(session.user.id);
    isSOAFeatureEnabled =
      flags['is-statement-of-applicability-enabled'] === true ||
      flags['is-statement-of-applicability-enabled'] === 'true';

    // Check if organization has ISO 27001 framework
    const isoFrameworkInstance = await db.frameworkInstance.findFirst({
      where: {
        organizationId: orgId,
        framework: {
          name: {
            in: ['ISO 27001', 'iso27001', 'ISO27001'],
          },
        },
      },
    });
    hasISO27001 = !!isoFrameworkInstance;
  }

  const menuItems = [
    {
      path: `/${orgId}/questionnaire`,
      label: 'Questionnaires',
    },
  ];

  // Only show Statement of Applicability tab if organization has ISO 27001 and feature flag is enabled
  if (hasISO27001 && isSOAFeatureEnabled) {
    menuItems.push({
      path: `/${orgId}/questionnaire/soa`,
      label: 'Statement of Applicability',
    });
  }

  menuItems.push({
    path: `/${orgId}/questionnaire/knowledge-base`,
    label: 'Knowledge Base',
  });

  return (
    <div className="m-auto flex max-w-[1200px] flex-col py-8">
      <SecondaryMenu items={menuItems} />
      <div className="pt-4">{children}</div>
    </div>
  );
}

