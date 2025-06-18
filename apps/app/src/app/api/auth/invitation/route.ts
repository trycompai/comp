import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inviteCode = searchParams.get('code');

  if (!inviteCode) {
    return redirect('/');
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    // If not logged in, redirect to auth with the invite code
    return redirect(`/auth?inviteCode=${encodeURIComponent(inviteCode)}`);
  }

  // If logged in, redirect to the invitation page, which will handle validation
  return redirect(`/invite/${inviteCode}`);
}
