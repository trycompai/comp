import { getFeatureFlags } from '@/app/posthog';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { db } from '@db';
import { SOAFrameworkTable } from './components/SOAFrameworkTable';
import { env } from '@/env.mjs';
import type { FrameworkWithSOAData } from './types';

export default async function SOAPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return notFound();
  }

  // Check feature flag on server
  const flags = await getFeatureFlags(session.user.id);
  const isSOAFeatureEnabled =
    flags['is-statement-of-applicability-enabled'] === true ||
    flags['is-statement-of-applicability-enabled'] === 'true';

  if (!isSOAFeatureEnabled) {
    return notFound();
  }

  const organizationId = session.session.activeOrganizationId;

  // Find ISO 27001 framework instance for this organization
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

  if (!isoFrameworkInstance?.framework) {
    return (
      <PageWithBreadcrumb
        breadcrumbs={[
          { label: 'SOA', current: true },
        ]}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
              Statement of Applicability
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Auto-complete Statement of Applicability for ISO 27001. Generate answers based on
              your organization's policies and documentation.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center rounded-lg border">
            <p className="text-muted-foreground">
              ISO 27001 framework not found. Please add ISO 27001 framework to your organization to get started.
            </p>
          </div>
        </div>
      </PageWithBreadcrumb>
    );
  }

  const frameworkId = isoFrameworkInstance.frameworkId;
  const framework = isoFrameworkInstance.framework;

  // Ensure SOA setup exists (creates both configuration and document if missing)
  // Call API directly from server component
  let setupResult: {
    success: boolean;
    configuration?: unknown;
    document?: unknown;
    error?: string;
  } | null = null;
  
  try {
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
          'Cookie': cookieHeader,
        },
      });
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        jwtToken = tokenData.token || null;
      }
    } catch (tokenError) {
      console.warn('Failed to get JWT token, continuing without it:', tokenError);
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

    setupResult = await response.json();
  } catch (error) {
    console.error('Failed to setup SOA:', error);
    return (
      <PageWithBreadcrumb
        breadcrumbs={[
          { label: 'SOA', current: true },
        ]}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
              Statement of Applicability
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Auto-complete Statement of Applicability for ISO 27001. Generate answers based on
              your organization's policies and documentation.
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Failed to setup SOA. Please try again later.</p>
          </div>
        </div>
      </PageWithBreadcrumb>
    );
  }

  // Get configuration and document from setup result
  const configuration = setupResult?.configuration as FrameworkWithSOAData['configuration'] | null | undefined;
  const document = setupResult?.document as FrameworkWithSOAData['document'] | null | undefined;

  // Fetch approver member (for pending approval or approved documents)
  let approver: Awaited<ReturnType<typeof db.member.findUnique<{
    where: { id: string };
    include: { user: { select: { id: true; name: true; email: true } } };
  }>>> | null = null;
  if (document && 'approverId' in document && document.approverId) {
    approver = await db.member.findUnique({
      where: { id: document.approverId as string },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
    canApprove = currentMember ? (currentMember.role.includes('owner') || currentMember.role.includes('admin')) : false;
    
    // Check if document is pending approval and current member is the approver
    isPendingApproval = !!(document && 'status' in document && document.status === 'needs_review');
    canCurrentUserApprove = !!(isPendingApproval && document && 'approverId' in document && document.approverId === currentMember?.id);
  }

  // Get owner/admin members for approval selection
  const ownerAdminMembers = await db.member.findMany({
    where: {
      organizationId,
      deactivated: false,
      OR: [
        { role: { contains: 'owner' } },
        { role: { contains: 'admin' } },
      ],
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

  // Check if organization is fully remote by querying Context table directly
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

    console.log('[SOA Page] Team work context check:', {
      organizationId,
      found: !!teamWorkContext,
      question: teamWorkContext?.question,
      answer: teamWorkContext?.answer,
    });

    if (teamWorkContext?.answer) {
      const answerLower = teamWorkContext.answer.toLowerCase();
      isFullyRemote = answerLower.includes('fully remote') || answerLower.includes('fully-remote');
      
      console.log('[SOA Page] Fully remote check result:', {
        organizationId,
        answer: teamWorkContext.answer,
        answerLower,
        isFullyRemote,
        containsFullyRemote: answerLower.includes('fully remote'),
        containsFullyRemoteHyphen: answerLower.includes('fully-remote'),
      });
    } else {
      console.log('[SOA Page] No team work context found for organization:', organizationId);
    }
  } catch (error) {
    // If check fails, default to false
    console.error('[SOA Page] Failed to check team work mode:', error);
  }

  if (!configuration || !document) {
    return (
      <PageWithBreadcrumb
        breadcrumbs={[
          { label: 'SOA', current: true },
        ]}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
              Statement of Applicability
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Auto-complete Statement of Applicability for ISO 27001. Generate answers based on
              your organization's policies and documentation.
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        </div>
      </PageWithBreadcrumb>
    );
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: '', current: true },
      ]}
    >
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
            Statement of Applicability
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Auto-complete Statement of Applicability for ISO 27001. Generate answers based on
            your organization's policies and documentation.
          </p>
        </div>

        {/* Main SOA Content */}
        <SOAFrameworkTable
          framework={framework}
          configuration={configuration}
          document={document}
          organizationId={organizationId}
          isFullyRemote={isFullyRemote}
          canApprove={canApprove}
          approver={approver as any}
          isPendingApproval={isPendingApproval}
          canCurrentUserApprove={canCurrentUserApprove}
          currentMemberId={currentMember?.id || null}
          ownerAdminMembers={ownerAdminMembers as any}
        />
      </div>
    </PageWithBreadcrumb>
  );
}
