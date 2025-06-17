import { isAuthorized } from '@/app/lib/utils';
import { db } from '@comp/db';
import { redirect } from 'next/navigation';
import { PoliciesClientPage } from './PoliciesClientPage'; // Import the new Client Component

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
