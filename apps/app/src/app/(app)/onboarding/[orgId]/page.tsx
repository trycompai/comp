import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { PostPaymentOnboarding } from '../components/PostPaymentOnboarding';

interface OnboardingPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { orgId } = await params;

  // Get current user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect('/auth');
  }

  // Get organization with subscription info
  const organization = await db.organization.findFirst({
    where: {
      id: orgId,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      context: {
        where: {
          tags: {
            has: 'onboarding',
          },
        },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  // Check if already completed onboarding
  if (organization.onboardingCompleted) {
    redirect(`/${orgId}/`);
  }

  // Check if they have a subscription
  if (!organization.hasAccess) {
    redirect(`/upgrade/${orgId}`);
  }

  // Convert context to initial data format
  const initialData: Record<string, any> = {};
  organization.context.forEach((ctx) => {
    // Map questions back to field keys (this is a bit hacky but works)
    if (ctx.question.includes('framework')) {
      initialData.frameworkIds = ctx.answer.split(', ');
    }
  });

  // Local-only: prefill onboarding fields to speed up development
  const hdrs = await headers();
  const host = hdrs.get('host') || '';
  const isLocal =
    process.env.NODE_ENV !== 'production' ||
    host.includes('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('::1');

  if (isLocal) {
    Object.assign(initialData, {
      describe:
        initialData.describe ||
        'Bubba AI, Inc. is the company behind Comp AI - the fastest way to get SOC 2 compliant.',
      industry: initialData.industry || 'SaaS',
      teamSize: initialData.teamSize || '1-10',
      devices: initialData.devices || 'Personal laptops',
      authentication: initialData.authentication || 'Google Workspace',
      software:
        initialData.software || 'Rippling, HubSpot, Slack, Notion, Linear, GitHub, Figma, Stripe',
      workLocation: initialData.workLocation || 'Fully remote',
      infrastructure: initialData.infrastructure || 'AWS, Vercel',
      dataTypes: initialData.dataTypes || 'Employee data',
      geo: initialData.geo || 'North America,Europe (EU)',
    });
  }

  // We'll use a modified version that starts at step 3
  return (
    <PostPaymentOnboarding
      organization={organization}
      initialData={initialData}
      userEmail={session.user.email}
    />
  );
}
