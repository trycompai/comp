import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// This endpoint is ONLY for E2E tests - never enable in production!
export async function POST(request: NextRequest) {
  console.log('[TEST-GRANT-ACCESS] =========================');
  console.log('[TEST-GRANT-ACCESS] Endpoint hit at:', new Date().toISOString());
  console.log('[TEST-GRANT-ACCESS] E2E_TEST_MODE:', process.env.E2E_TEST_MODE);
  console.log('[TEST-GRANT-ACCESS] NODE_ENV:', process.env.NODE_ENV);
  console.log('[TEST-GRANT-ACCESS] =========================');

  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    console.log('[TEST-GRANT-ACCESS] E2E_TEST_MODE is not true:', process.env.E2E_TEST_MODE);
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  console.log('[TEST-GRANT-ACCESS] E2E mode verified');

  try {
    const body = await request.json();
    console.log('[TEST-GRANT-ACCESS] Request body:', body);

    const { orgId, hasAccess } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    console.log(
      '[TEST-GRANT-ACCESS] Updating organization access:',
      orgId,
      'hasAccess:',
      hasAccess,
    );

    // Update the organization's hasAccess field
    const updatedOrg = await db.organization.update({
      where: { id: orgId },
      data: { hasAccess: hasAccess !== undefined ? hasAccess : true },
    });

    console.log('[TEST-GRANT-ACCESS] Successfully updated organization:', updatedOrg.id);

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
