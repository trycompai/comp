import { auth } from '@/utils/auth';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return redirect('/');
  }

  // Fetch all members first
  const allMembers = await db.member.findMany({
    where: {
      organizationId: orgId,
      deactivated: false,
    },
  });

  const employees = allMembers.filter((member) => {
    const roles = member.role.includes(',') ? member.role.split(',') : [member.role];
    return roles.includes('employee') || roles.includes('contractor');
  });

  return (
    <div className="m-auto max-w-[1200px] py-8">
      <SecondaryMenu
        items={[
          {
            path: `/${orgId}/people/all`,
            label: 'People',
            activeOverrideIdPrefix: 'mem_',
          },
          ...(employees.length > 0
            ? [
                {
                  path: `/${orgId}/people/dashboard`,
                  label: 'Employee Tasks',
                },
              ]
            : []),
          {
            path: `/${orgId}/people/devices`,
            label: 'Employee Devices',
          },
        ]}
      />

      <main>{children}</main>
    </div>
  );
}
