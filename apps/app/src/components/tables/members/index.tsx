import { getOrganizationUsersAction } from '@/actions/organization/get-organization-users-action';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';

export async function MembersTable() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const members = await getOrganizationUsersAction();

  return <div>MembersTable</div>;
}
