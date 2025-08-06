import { OrganizationSwitcher } from '@/components/organization-switcher';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { T } from 'gt-next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NoAccess() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return redirect('/');
  }

  const organizations = await db.organization.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  const currentOrg = await db.organization.findUnique({
    where: {
      id: session.session.activeOrganizationId,
    },
  });

  return (
    <div className="bg-foreground/05 flex h-dvh flex-col items-center justify-center gap-4">
      <T>
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </T>
      <div className="flex flex-col text-center">
        <T>
          <p>
            <b>Employees</b> don&apos;t have access to app.trycomp.ai, did you mean to go to{' '}
            <Link href="https://portal.trycomp.ai" className="text-primary underline">
              portal.trycomp.ai
            </Link>
            ?
          </p>
        </T>
        <T>
          <p>Please select another organization or contact your organization administrator.</p>
        </T>
      </div>
      <div>
        <OrganizationSwitcher organizations={organizations} organization={currentOrg} />
      </div>
    </div>
  );
}
