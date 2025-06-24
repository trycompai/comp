import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DubReferral } from './components/DubReferral';
import { dub } from './lib/dub';

export default async function ReferralsPage() {
  const publicToken = await createPublicToken();

  return <DubReferral publicToken={publicToken} />;
}

async function createPublicToken() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/');
  }

  if (!env.DUB_PROGRAM_ID || !env.DUB_API_KEY) {
    return null;
  }

  const { publicToken } = await dub.embedTokens.referrals({
    programId: env.DUB_PROGRAM_ID,
    partner: {
      tenantId: session.user.id,
      name: session.user.name || '',
      email: session.user.email || '',
      image: session.user.image || '',
    },
  });

  return publicToken;
}
