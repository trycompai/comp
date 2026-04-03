import { inviteMembersViaApi, type InviteMemberInput } from '@/lib/people-api';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invites = body.invites as InviteMemberInput[] | undefined;

    if (!Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json(
        { error: 'At least one invite is required.' },
        { status: 400 },
      );
    }

    const response = await inviteMembersViaApi({ invites });
    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json({ results: response.data?.results ?? [] });
  } catch (error) {
    console.error('Error processing invitations:', error);
    return NextResponse.json(
      { error: 'Failed to process invitations.' },
      { status: 500 },
    );
  }
}
