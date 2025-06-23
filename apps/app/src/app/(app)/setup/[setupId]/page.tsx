import { getOrganizations } from '@/data/getOrganizations';
import { auth } from '@/utils/auth';
import type { Organization } from '@comp/db/types';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrganizationSetupForm } from '../components/OrganizationSetupForm';
import { getSetupSession } from '../lib/setup-session';

export const metadata: Metadata = {
  title: 'Setup Your Organization | Comp AI',
};

interface SetupPageProps {
  params: Promise<{ setupId: string }>;
  searchParams: Promise<{ inviteCode?: string }>;
}

export default async function SetupWithIdPage({ params, searchParams }: SetupPageProps) {
  const { setupId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user;

  if (!session || !session.session || !user) {
    return redirect('/auth');
  }

  // Verify the setup session exists and belongs to this user
  const setupSession = await getSetupSession(setupId);

  if (!setupSession || setupSession.userId !== user.id) {
    // Invalid or expired session, redirect to regular setup
    return redirect('/setup');
  }

  // If there's an inviteCode in the URL, redirect to the new invitation route
  const { inviteCode } = await searchParams;
  if (inviteCode) {
    return redirect(`/invite/${inviteCode}`);
  }

  // Fetch existing organizations
  let organizations: Organization[] = [];

  try {
    const result = await getOrganizations();
    organizations = result.organizations;
  } catch (error) {
    // If user has no organizations, continue with empty array
    console.error('Failed to fetch organizations:', error);
  }

  return (
    <OrganizationSetupForm
      existingOrganizations={organizations}
      setupId={setupId}
      initialData={setupSession.formData}
      currentStep={setupSession.currentStep}
    />
  );
}
