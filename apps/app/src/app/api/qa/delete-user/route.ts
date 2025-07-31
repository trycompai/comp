import { db } from '@db';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/qa/delete-user
 *
 * Deletes a user and all associated data.
 * This is an internal endpoint for QA team.
 *
 * Headers:
 * - Authorization: Bearer {QA_SECRET}
 *
 * Body:
 * - userId: string - The ID of the user to delete.
 * - email: string - The email of the user to delete.
 *
 * Returns:
 * - 200: { success: true, message: "User deleted successfully", userId: string }
 * - 400: { success: false, error: "Missing userId or email in request body" }
 * - 401: { success: false, error: "Unauthorized" }
 * - 500: { success: false, error: "Failed to delete user" }
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

  const { userId, email } = body;

  if (!userId || !email) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing userId or email in request body',
      },
      { status: 400 },
    );
  }

  try {
    // Check if user exists with matching id and email
    const existingUser = await db.user.findUnique({
      where: {
        id: userId,
        email: email,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete user',
        },
        { status: 500 },
      );
    }

    // Delete the user (cascading deletes will handle related records)
    await db.user.delete({
      where: {
        id: userId,
        email: email,
      },
    });

    console.log(`QA: User ${userId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      userId: userId,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete user',
      },
      { status: 500 },
    );
  }
}
