import { getOrganizationFromApiKey } from '@/lib/api-key';
import { db } from '@comp/db';
import { type NextRequest, NextResponse } from 'next/server';

// Configure this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

/**
 * GET /api/v1/people/:id
 *
 * Get a single employee by ID for the organization associated with the API key
 *
 * Headers:
 * - Authorization: Bearer {api_key} or X-API-Key: {api_key}
 *
 * Path Parameters:
 * - id: string - The ID of the employee to fetch
 *
 * Returns:
 * - 200: { success: true, data: Employee }
 * - 401: { success: false, error: "Invalid or missing API key" }
 * - 404: { success: false, error: "Employee not found" }
 * - 500: { success: false, error: "Failed to fetch employee" }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get the organization ID from the API key
  const { organizationId, errorResponse } = await getOrganizationFromApiKey(request);

  // If there's an error response, return it
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const employeeId = (await params).id;

    // Fetch the employee
    const employee = await db.member.findFirst({
      where: {
        id: employeeId,
        organizationId: organizationId!,
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        department: true,
        isActive: true,
      },
    });

    // If employee not found, return 404
    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch employee',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/people/:id
 *
 * Delete an employee by ID for the organization associated with the API key
 *
 * Headers:
 * - Authorization: Bearer {api_key} or X-API-Key: {api_key}
 *
 * Path Parameters:
 * - id: string - The ID of the employee to delete
 *
 * Returns:
 * - 200: { success: true, data: { message: string } }
 * - 401: { success: false, error: string }
 * - 404: { success: false, error: string }
 * - 500: { success: false, error: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Get the organization ID from the API key
  const { organizationId, errorResponse } = await getOrganizationFromApiKey(request);

  // If there's an error response, return it
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const employeeId = (await params).id;

    // Check if the employee exists and belongs to the organization
    const existingEmployee = await db.member.findFirst({
      where: {
        id: employeeId,
        organizationId: organizationId!,
      },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee not found',
        },
        { status: 404 },
      );
    }

    // Delete the employee
    await db.member.delete({
      where: {
        id: employeeId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Employee deleted successfully',
      },
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete employee',
      },
      { status: 500 },
    );
  }
}
