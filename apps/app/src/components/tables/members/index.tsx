import { getOrganizationUsersAction } from '@/actions/organization/get-organization-users-action';
import { auth } from '@/utils/auth';
import { T } from 'gt-next';
import { headers } from 'next/headers';

export async function MembersTable() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const members = await getOrganizationUsersAction();

  return <div><T>MembersTable</T></div>;
}
