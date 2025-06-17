import { auth } from '@/utils/auth';
import { authClient } from '@/utils/auth-client';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

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
    return redirect(`/auth?inviteCode=${encodeURIComponent(inviteCode)}`);
  }

  try {
    await authClient.organization.acceptInvitation({
      invitationId: inviteCode,
    });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Error accepting invitation:', error);

    return redirect(`/auth/invite/error?message=${encodeURIComponent((error as Error).message)}`);
  }
}
