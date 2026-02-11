import { getFeatureFlags } from '@/app/posthog';
import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QuestionnaireTabs } from './components/QuestionnaireTabs';
import {
  getContextEntries,
  getKnowledgeBaseDocuments,
  getManualAnswers,
  getPublishedPolicies,
} from './knowledge-base/data/queries';
import { getQuestionnaires } from './start_page/data/queries';

export default async function SecurityQuestionnairePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return notFound();
  }

  // Check feature flag on server
  const flags = await getFeatureFlags(session.user.id);
  const isFeatureEnabled = flags['ai-vendor-questionnaire'] === true;

  if (!isFeatureEnabled) {
    return notFound();
  }

  const organizationId = session.session.activeOrganizationId;

  // Check if organization has published policies
  const hasPublishedPolicies = await checkPublishedPolicies(organizationId);

  // Fetch questionnaires history
  const questionnaires = await getQuestionnaires(organizationId);

  // Check SOA feature flag and ISO 27001
  const isSOAFeatureEnabled =
    flags['is-statement-of-applicability-enabled'] === true ||
    flags['is-statement-of-applicability-enabled'] === 'true';

  const isoFrameworkInstance = await db.frameworkInstance.findFirst({
    where: {
      organizationId,
      framework: {
        name: {
          in: ['ISO 27001', 'iso27001', 'ISO27001'],
        },
      },
    },
    include: {
      framework: true,
    },
  });

  const hasISO27001 = !!isoFrameworkInstance?.framework;
  const showSOATab = hasISO27001 && isSOAFeatureEnabled;

  // Fetch SOA data if needed
  let soaData = null;
  let soaError: string | null = null;

  if (showSOATab && isoFrameworkInstance?.framework) {
    try {
      const frameworkId = isoFrameworkInstance.frameworkId;
      const framework = isoFrameworkInstance.framework;

      // Call API to ensure SOA setup
      const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
      const headersList = await headers();
      const cookieHeader = headersList.get('cookie') || '';

      // Get JWT token from Better Auth server-side
      let jwtToken: string | null = null;
      try {
        const authUrl = env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000';
        const tokenResponse = await fetch(`${authUrl}/api/auth/token`, {
          method: 'GET',
          headers: {
            Cookie: cookieHeader,
          },
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          jwtToken = tokenData.token || null;
        }
      } catch {
        console.warn('Failed to get JWT token, continuing without it');
      }

      const apiHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Organization-Id': organizationId,
      };

      if (jwtToken) {
        apiHeaders['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/v1/soa/ensure-setup`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          frameworkId,
          organizationId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }

      const setupResult = await response.json();
      const configuration = setupResult?.configuration;
      const document = setupResult?.document;

      if (configuration && document) {
        // Fetch approver member with full user data
        let approver = null;
        if (document && 'approverId' in document && document.approverId) {
          approver = await db.member.findUnique({
            where: { id: document.approverId as string },
            include: {
              user: true,
            },
          });
        }

        // Get current user member and check permissions
        let currentMember = null;
        let canApprove = false;
        let isPendingApproval = false;
        let canCurrentUserApprove = false;

        if (session?.user?.id) {
          currentMember = await db.member.findFirst({
            where: {
              organizationId,
              userId: session.user.id,
              deactivated: false,
            },
          });
          canApprove = currentMember
            ? currentMember.role.includes('owner') || currentMember.role.includes('admin')
            : false;
          isPendingApproval = !!(
            document &&
            'status' in document &&
            document.status === 'needs_review'
          );
          canCurrentUserApprove = !!(
            isPendingApproval &&
            document &&
            'approverId' in document &&
            document.approverId === currentMember?.id
          );
        }

        // Get owner/admin members for approval selection
        const ownerAdminMembers = await db.member.findMany({
          where: {
            organizationId,
            deactivated: false,
            OR: [{ role: { contains: 'owner' } }, { role: { contains: 'admin' } }],
          },
          include: {
            user: true,
          },
          orderBy: {
            user: {
              name: 'asc',
            },
          },
        });

        // Check if organization is fully remote
        let isFullyRemote = false;
        try {
          const teamWorkContext = await db.context.findFirst({
            where: {
              organizationId,
              question: {
                contains: 'How does your team work',
                mode: 'insensitive',
              },
            },
          });

          if (teamWorkContext?.answer) {
            const answerLower = teamWorkContext.answer.toLowerCase();
            isFullyRemote =
              answerLower.includes('fully remote') || answerLower.includes('fully-remote');
          }
        } catch {
          // Default to false
        }

        soaData = {
          framework,
          configuration,
          document,
          isFullyRemote,
          canApprove,
          approver,
          isPendingApproval,
          canCurrentUserApprove,
          currentMemberId: currentMember?.id || null,
          ownerAdminMembers,
        };
      }
    } catch (error) {
      console.error('Failed to setup SOA:', error);
      soaError = 'Failed to setup SOA. Please try again later.';
    }
  } else if (showSOATab && !isoFrameworkInstance?.framework) {
    soaError =
      'ISO 27001 framework not found. Please add ISO 27001 framework to your organization to get started.';
  }

  // Fetch Knowledge Base data
  const [policies, contextEntries, manualAnswers, documents] = await Promise.all([
    getPublishedPolicies(organizationId),
    getContextEntries(organizationId),
    getManualAnswers(organizationId),
    getKnowledgeBaseDocuments(organizationId),
  ]);

  return (
    <QuestionnaireTabs
      organizationId={organizationId}
      questionnaires={questionnaires}
      hasPublishedPolicies={hasPublishedPolicies}
      showSOATab={showSOATab}
      soaData={soaData}
      soaError={soaError}
      policies={policies}
      contextEntries={contextEntries}
      manualAnswers={manualAnswers}
      documents={documents}
    />
  );
}

const checkPublishedPolicies = async (organizationId: string): Promise<boolean> => {
  const count = await db.policy.count({
    where: {
      organizationId,
      status: 'published',
      isArchived: false,
    },
  });

  return count > 0;
};
