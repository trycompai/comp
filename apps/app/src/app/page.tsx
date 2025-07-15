import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Helper function to build URL with search params
  const buildUrlWithParams = async (path: string): Promise<string> => {
    const params = new URLSearchParams();
    Object.entries(await searchParams).forEach(([key, value]) => {
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
    return redirect(await buildUrlWithParams('/auth'));
  }

  const orgId = session.session.activeOrganizationId;

  if (!orgId) {
    return redirect(await buildUrlWithParams('/setup'));
  }

  const member = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
    },
  });

  if (member?.role === 'employee') {
    return redirect(await buildUrlWithParams('/no-access'));
  }

  if (!member) {
    return redirect(await buildUrlWithParams('/setup'));
  }

  return redirect(await buildUrlWithParams(`/${orgId}/frameworks`));
}
