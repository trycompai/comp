import { db, Departments } from "@bubba/db";
import { NextResponse, type NextRequest } from "next/server";
import { getOrganizationFromApiKey } from "@/lib/api-key";
import { z } from "zod";

// Define the schema for query parameters
const queryParamsSchema = z.object({
  active: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  department: z.nativeEnum(Departments).optional(),
  search: z.string().optional(),
});

// Type for the validated query parameters
type QueryParams = z.infer<typeof queryParamsSchema>;

/**
 * GET /api/v1/employees
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
  const { organizationId, errorResponse } =
    await getOrganizationFromApiKey(request);

  // If there's an error response, return it
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;

    // Create an object from the search params
    const queryParamsObj = {
      active: searchParams.get("active") || undefined,
      department: searchParams.get("department") || undefined,
      search: searchParams.get("search") || undefined,
    };

    // Validate query parameters
    const validationResult = queryParamsSchema.safeParse(queryParamsObj);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 }
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

    // Add search filter if provided
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Fetch employees
    const employees = await db.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
        externalEmployeeId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Format dates for JSON response
    const formattedEmployees = employees.map((employee) => ({
      ...employee,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: formattedEmployees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
