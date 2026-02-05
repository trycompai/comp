import { auth } from '@/utils/auth';
import { db } from '@db';
import { env } from '@/env.mjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (
      !session?.session?.activeOrganizationId ||
      !session.session.userId
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;
    const currentUserId = session.session.userId;

    const { memberId, organizationId: bodyOrgId } = await req.json();

    if (organizationId !== bodyOrgId) {
      return NextResponse.json(
        { error: 'You do not have access to this organization.' },
        { status: 403 },
      );
    }

    // Check caller is a member and has permission
    const currentUserMember = await db.member.findFirst({
      where: { organizationId, userId: currentUserId, deactivated: false },
    });

    if (!currentUserMember) {
      return NextResponse.json(
        { error: 'You do not have permission to generate certificates.' },
        { status: 403 },
      );
    }

    // Users can generate their own certificate; admins/owners can generate for anyone
    const isAdmin =
      currentUserMember.role.includes('admin') ||
      currentUserMember.role.includes('owner');
    const isSelf = currentUserMember.id === memberId;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'You do not have permission to generate this certificate.' },
        { status: 403 },
      );
    }

    const apiUrl =
      env.NEXT_PUBLIC_API_URL ||
      process.env.API_BASE_URL ||
      'http://localhost:3333';

    const internalToken = env.INTERNAL_API_TOKEN;
    if (!internalToken) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 },
      );
    }

    const response = await fetch(`${apiUrl}/v1/training/generate-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': internalToken,
      },
      body: JSON.stringify({ memberId, organizationId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to generate certificate: ${errorText}` },
        { status: response.status },
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="training-certificate.pdf"',
      },
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate.' },
      { status: 500 },
    );
  }
}
