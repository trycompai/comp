import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { createSetupSession } from './lib/setup-session';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Get search params from the request
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';

  if (!session?.user?.id) {
    redirect(`/sign-in${queryString}`);
  }

  const setupSession = await createSetupSession(session.user.id);
  redirect(`/setup/${setupSession.id}${queryString}`);
}
