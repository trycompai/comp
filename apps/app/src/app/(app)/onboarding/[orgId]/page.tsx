import { auth } from '@/utils/auth';
import { db } from '@comp/db';
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

  // We'll use a modified version that starts at step 3
  return <PostPaymentOnboarding organization={organization} initialData={initialData} />;
}
