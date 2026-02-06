import { auth } from '@/utils/auth';
import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.session?.activeOrganizationId || !session.session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;
    const currentUserId = session.session.userId;
    const { id: invitationId } = await params;

    // Validate caller permissions
    const currentUserMember = await db.member.findFirst({
      where: { organizationId, userId: currentUserId, deactivated: false },
    });

    if (
      !currentUserMember ||
      (!currentUserMember.role.includes('admin') &&
        !currentUserMember.role.includes('owner'))
    ) {
      return NextResponse.json(
        { error: "You don't have permission to revoke invitations." },
        { status: 403 },
      );
    }

    const invitation = await db.invitation.findFirst({
      where: { id: invitationId, organizationId, status: 'pending' },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already accepted.' },
        { status: 404 },
      );
    }

    await db.invitation.delete({ where: { id: invitationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invitation.' },
      { status: 500 },
    );
  }
}
