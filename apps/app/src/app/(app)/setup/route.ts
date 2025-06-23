import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSetupSession } from './lib/setup-session';

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const setupSession = await createSetupSession(session.user.id);
  redirect(`/setup/${setupSession.id}`);
}
