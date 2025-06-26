import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Helper function to build URL with search params
  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    });
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (!session) {
    return redirect(buildUrlWithParams('/auth'));
  }

  const orgId = session.session.activeOrganizationId;

  if (!orgId) {
    return redirect(buildUrlWithParams('/setup'));
  }

  const member = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
    },
  });

  if (member?.role === 'employee') {
    return redirect(buildUrlWithParams('/no-access'));
  }

  if (!member) {
    return redirect(buildUrlWithParams('/setup'));
  }

  return redirect(buildUrlWithParams(`/${orgId}/frameworks`));
}
