import { db } from '@db';
// Import types directly from @prisma/client
import type { Member, Organization, User } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
// Removed EmployeeTasksList import as it's not used directly here
import { NoAccessMessage } from './NoAccessMessage';
// Removed OrganizationSelector import
import { auth } from '@/app/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import Link from 'next/link';

// Define the type for the member prop including the user and organization relations
interface MemberWithUserOrg extends Member {
  user: User;
  organization: Organization;
}

// Removed OverviewProps interface and searchParams prop
// export async function Overview({ searchParams }: OverviewProps) {
export async function Overview() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth');
  }

  // Fetch all memberships for the user, including organization details
  const memberships = await db.member.findMany({
    where: {
      userId: session.user.id,
      // We might want to filter by role if needed, but let's see all memberships first
      // role: "employee", // Keep commented unless needed
    },
    include: {
      user: true,
      organization: true, // Include organization details
    },
  });

  // Case 1: No memberships found
  if (memberships.length === 0) {
    return <NoAccessMessage />;
  }

  // Filter memberships to only those with valid organization data
  const validMemberships = memberships.filter(
    (member): member is MemberWithUserOrg & { organization: Organization } =>
      Boolean(member.organization),
  );

  // If after filtering, there are no valid memberships with organizations
  if (validMemberships.length === 0) {
    // This case might indicate memberships exist but lack organization links
    console.warn('User has memberships but none with associated organizations.', {
      userId: session.user.id,
    });
    return <NoAccessMessage message="You don't seem to belong to any organizations currently." />;
  }

  if (validMemberships.length === 1) {
    return redirect(`/${validMemberships[0].organization.id}`);
  }

  // Render a dashboard for each valid membership
  return (
    <div className="space-y-8">
      <h1>Your Organizations</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {validMemberships.map((member) => (
          <Link href={`/${member.organization.id}`} key={member.id}>
            <Card>
              <CardHeader>
                <CardTitle>{member.organization.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{member.user.name}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
