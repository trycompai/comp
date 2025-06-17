import { db } from '@comp/db';
import { PoliciesClientPage } from './PoliciesClientPage'; // Import the new Client Component
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';

export default async function Page() {
  const isAllowed = await isAuthorized();

  if (!isAllowed) {
    redirect('/auth');
  }

  const policies = await db.frameworkEditorPolicyTemplate.findMany({
    // Add any ordering if necessary, e.g., orderBy: { name: 'asc' }
  });

  return <PoliciesClientPage initialPolicies={policies} />;
}
