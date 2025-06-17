import { getOrganizationFromApiKey } from '@/lib/api-key';
import { db } from '@comp/db';
import { Departments, Role } from '@comp/db/types';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Configure this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

// Define the schema for query parameters
const queryParamsSchema = z.object({
  active: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  department: z.nativeEnum(Departments).optional(),
  search: z.string().optional(),
});

// Define the schema for employee creation
const employeeCreateSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Valid email is required' }),
  department: z.nativeEnum(Departments).optional().default(Departments.none),
  isActive: z.boolean().optional().default(true),
  externalEmployeeId: z.string().optional().nullable(),
  role: z.string().optional().default('member'),
});

// Type for the validated query parameters
type QueryParams = z.infer<typeof queryParamsSchema>;

// Type for the validated employee creation data
type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

/**
 * GET /api/v1/people
 *
 * Get all employees for the organization associated with the API key
 *
 * Headers:
 * - Authorization: Bearer {api_key} or X-API-Key: {api_key}
 *
 * Query Parameters:
 * - active: boolean - Filter by active status (optional)
 * - department: string - Filter by department (optional)
 * - search: string - Search by name or email (optional)
 *
 * Returns:
 * - 200: { success: true, data: Employee[] }
 * - 401: { error: "Invalid or missing API key" }
 * - 400: { error: "Validation failed", details: {...} }
 * - 500: { error: "Failed to fetch employees" }
 */
export async function GET(request: NextRequest) {
  // Get the organization ID from the API key
  const { organizationId, errorResponse } = await getOrganizationFromApiKey(request);

  // If there's an error response, return it
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;

    // Create an object from the search params
    const queryParamsObj = {
      active: searchParams.get('active') || undefined,
      department: searchParams.get('department') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Validate query parameters
    const validationResult = queryParamsSchema.safeParse(queryParamsObj);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    // Extract validated query parameters
    const { active, department, search } = validationResult.data;

    // Build the where clause
    const where: any = {
      organizationId: organizationId!,
    };

    // Add active filter if provided
    if (active !== undefined) {
      where.isActive = active;
    }

    // Add department filter if provided
    if (department) {
      where.department = department;
    }

    // Query members with their associated users
    const members = await db.member.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    // Apply search filter if provided (we need to do this in memory due to nested user data)
    let filteredMembers = members;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMembers = members.filter(
        (member) =>
          member.user.name.toLowerCase().includes(searchLower) ||
          member.user.email.toLowerCase().includes(searchLower),
      );
    }

    // Format the response to include both member and user data
    const formattedEmployees = filteredMembers.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      department: member.department,
      isActive: member.isActive,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: formattedEmployees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

/**
 * POST /api/v1/people
 *
 * Create a new employee for the organization associated with the API key
 *
 * Headers:
 * - Authorization: Bearer {api_key} or X-API-Key: {api_key}
 *
 * Body:
 * - name: string - The name of the employee (required)
 * - email: string - The email of the employee (required)
 * - department: Departments - The department of the employee (optional, defaults to "none")
 * - isActive: boolean - Whether the employee is active (optional, defaults to true)
 * - externalEmployeeId: string - External employee ID (optional)
 * - role: string - Role in the organization (optional, defaults to "member")
 *
 * Returns:
 * - 200: { success: true, data: Employee }
 * - 400: { error: "Validation failed", details: {...} }
 * - 401: { error: "Invalid or missing API key" }
 * - 500: { error: "Failed to create employee" }
 */
export async function POST(request: NextRequest) {
  // Get the organization ID from the API key
  const { organizationId, errorResponse } = await getOrganizationFromApiKey(request);

  // If there's an error response, return it
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();

    // Validate the request body against the schema
    const validationResult = employeeCreateSchema.safeParse(body);

    if (!validationResult.success) {
      // Return validation errors
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    // Extract validated data
    const validatedData: EmployeeCreateInput = validationResult.data;

    // Start a transaction to ensure both user and member are created successfully
    const result = await db.$transaction(async (tx) => {
      // Check if a user with this email already exists
      let user = await tx.user.findUnique({
        where: {
          email: validatedData.email,
        },
      });

      // Create the user if they don't exist already
      if (!user) {
        user = await tx.user.create({
          data: {
            name: validatedData.name,
            email: validatedData.email,
            emailVerified: false, // Default as not verified
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Create the member record to link the user to the organization
      const member = await tx.member.create({
        data: {
          userId: user.id,
          organizationId: organizationId!,
          role: validatedData.role as Role,
          department: validatedData.department,
          isActive: validatedData.isActive ?? true,
          createdAt: new Date(),
        },
        include: {
          user: true,
        },
      });

      return {
        id: member.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        department: member.department,
        isActive: member.isActive,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create employee',
      },
      { status: 500 },
    );
  }
}
