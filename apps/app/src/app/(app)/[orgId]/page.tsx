import { auth } from '@/utils/auth';
import { db, Role } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

// Helper to safely parse comma-separated roles string
function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

export default async function DashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: organizationId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        deactivated: false,
      },
      select: { role: true },
    });

    if (member?.role) {
      const roles = parseRolesString(member.role);
      // Redirect to auditor view if user has auditor role but not admin or owner
      if (
        roles.includes(Role.auditor) &&
        !roles.includes(Role.admin) &&
        !roles.includes(Role.owner)
      ) {
        return redirect(`/${organizationId}/auditor`);
      }
    }
  }

  return redirect(`/${organizationId}/frameworks`);
}
