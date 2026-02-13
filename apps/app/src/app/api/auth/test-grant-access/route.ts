import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// This endpoint is ONLY for E2E tests - never enable in production!
export async function POST(request: NextRequest) {
  // SECONDARY GUARD: Block in production even if E2E_TEST_MODE is accidentally set
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const { orgId, hasAccess } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Update the organization's hasAccess field
    const updatedOrg = await db.organization.update({
      where: { id: orgId },
      data: { hasAccess: hasAccess !== undefined ? hasAccess : true },
    });

    return NextResponse.json({
      success: true,
      organizationId: updatedOrg.id,
      hasAccess: updatedOrg.hasAccess,
    });
  } catch (error) {
    console.error('[TEST-GRANT-ACCESS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization access', details: error },
      { status: 500 },
    );
  }
}
