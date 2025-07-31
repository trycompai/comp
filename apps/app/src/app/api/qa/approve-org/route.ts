import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/qa/approve-organization
 *
 * Approves an organization by setting hasAccess to true.
 * This is an internal endpoint for QA team.
 *
 * Headers:
 * - Authorization: Bearer {QA_SECRET}
 *
 * Body:
 * - organizationId: string - The ID of the organization to approve.
 *
 * Returns:
 * - 200: { success: true, message: "Organization approved successfully", organizationId: string }
 * - 400: { success: false, error: "Missing organizationId in request body" }
 * - 401: { success: false, error: "Unauthorized" }
 * - 404: { success: false, error: "Organization not found" }
 * - 500: { success: false, error: "Failed to approve organization" }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const qaSecret = process.env.QA_SECRET;

  if (!qaSecret) {
    console.error('QA_SECRET is not set in environment variables.');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server configuration error.',
      },
      { status: 500 },
    );
  }

  const token = authHeader?.split(' ')[1];

  if (!token || token !== qaSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON in request body',
      },
      { status: 400 },
    );
  }

  const { organizationId } = body;

  if (!organizationId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing organizationId in request body',
      },
      { status: 400 },
    );
  }

  try {
    // Check if organization exists
    const existingOrg = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existingOrg) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization not found',
        },
        { status: 404 },
      );
    }

    // Approve the organization by setting hasAccess to true
    const updatedOrg = await db.organization.update({
      where: { id: organizationId },
      data: { hasAccess: true },
    });

    console.log(`QA: Organization ${organizationId} approved successfully`);

    return NextResponse.json({
      success: true,
      message: 'Organization approved successfully',
      organizationId: updatedOrg.id,
      hasAccess: updatedOrg.hasAccess,
    });
  } catch (error) {
    console.error('Error approving organization:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve organization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
