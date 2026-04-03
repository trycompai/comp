import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface AuthMeResponse {
  organizations: Array<{ id: string }>;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect('/auth');
  }

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  const meRes = await serverApi.get<AuthMeResponse>('/v1/auth/me');
  const orgs = meRes.data?.organizations ?? [];
  const activeOrgId = session.session.activeOrganizationId;
  const targetOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];

  if (targetOrg) {
    redirect(`/${targetOrg.id}/admin`);
  }

  redirect('/');
}
