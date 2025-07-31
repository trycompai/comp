import { initializeOrganization } from '@/actions/organization/lib/initialize-organization';
import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';

// Configure this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

/**
 * POST /api/retool/reset-org
 *
 * Resets an organization's data by deleting tasks, policies, controls, and framework instances.
 * This is an internal endpoint for Retool.
 *
 * Headers:
 * - Authorization: Bearer {RETOOL_COMP_API_SECRET}
 *
 * Body:
 * - organization_id: string - The ID of the organization to reset.
 *
 * Returns:
 * - 200: { success: true, message: "Organization reset successfully" }
 * - 400: { success: false, error: "Missing organization_id in request body" }
 * - 401: { success: false, error: "Unauthorized" }
 * - 500: { success: false, error: "Failed to reset organization" }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const retoolApiSecret = process.env.RETOOL_COMP_API_SECRET;

  if (!retoolApiSecret) {
    console.error('RETOOL_COMP_API_SECRET is not set in environment variables.');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server configuration error.',
      },
      { status: 500 },
    );
  }

  const token = authHeader?.split(' ')[1];

  if (!token || token !== retoolApiSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { organization_id: organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing organization_id in request body',
        },
        { status: 400 },
      );
    }

    // Use a transaction to ensure all or no deletions happen
    await db.$transaction([
      db.task.deleteMany({
        where: { organizationId },
      }),
      db.policy.deleteMany({
        where: { organizationId },
      }),
      db.control.deleteMany({
        where: { organizationId },
      }),
      db.frameworkInstance.deleteMany({
        where: { organizationId },
      }),
      db.onboarding.update({
        where: { organizationId },
        data: {
          triggerJobCompleted: false,
        },
      }),
    ]);

    await initializeOrganization({
      frameworkIds: ['frk_683f377429b8408d1c85f9bd'],
      organizationId,
    });

    return NextResponse.json({
      success: true,
      message: 'Organization reset successfully',
    });
  } catch (error) {
    console.error('Error resetting organization:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset organization',
      },
      { status: 500 },
    );
  }
}
