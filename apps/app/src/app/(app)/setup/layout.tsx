import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface OrgInfo {
  id: string;
  onboardingCompleted: boolean;
}

interface AuthMeResponse {
  organizations: OrgInfo[];
}

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const intent = hdrs.get('x-intent');

  const session = await auth.api.getSession({ headers: await headers() });
  if (session && intent !== 'create-additional') {
    const meRes = await serverApi.get<AuthMeResponse>('/v1/auth/me');
    const orgs = meRes.data?.organizations ?? [];

    // Find the most recently relevant org (API returns them, pick first)
    const userOrg = orgs[0];
    if (userOrg) {
      if (userOrg.onboardingCompleted === false) {
        return redirect(`/onboarding/${userOrg.id}`);
      }
      return redirect(`/${userOrg.id}`);
    }
  }

  return <>{children}</>;
}
