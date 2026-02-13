import { db, Departments } from '@db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // SECONDARY GUARD: Block in production even if E2E_TEST_MODE is accidentally set
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  try {
    // Test basic query
    const userCount = await db.user.count();

    // Create a test organization first
    const testOrg = await db.organization.create({
      data: {
        id: `org_test_${Date.now()}`,
        name: 'Test DB Org',
        hasAccess: true,
      },
    });

    // Test creating a simple user
    const testUser = await db.user.create({
      data: {
        id: `test_user_${Date.now()}`,
        email: `test-db-${Date.now()}@example.com`,
        name: 'DB Test User',
        emailVerified: false,
        members: {
          create: {
            id: `test_member_${Date.now()}`,
            organizationId: testOrg.id,
            department: Departments.it,
            isActive: false,
            fleetDmLabelId: 0,
            role: 'member',
          },
        },
      },
    });

    // Clean up
    await db.user.delete({
      where: { id: testUser.id },
    });

    await db.organization.delete({
      where: { id: testOrg.id },
    });

    return NextResponse.json({
      success: true,
      userCount,
      database: 'working',
    });
  } catch (error) {
    console.error('[TEST-DB] Error:', error);
    return NextResponse.json(
      {
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
