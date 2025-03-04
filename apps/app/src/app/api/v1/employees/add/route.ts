import { db, Departments } from "@bubba/db";
import { NextResponse, type NextRequest } from "next/server";
import { getOrganizationFromApiKey } from "@/lib/api-key";
import { z } from "zod";

// Define the schema for employee creation
const employeeCreateSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  department: z.nativeEnum(Departments).optional().default(Departments.none),
  isActive: z.boolean().optional().default(true),
  externalEmployeeId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  linkId: z.string().optional().nullable(),
});

// Type for the validated data
type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export async function POST(request: NextRequest) {
  // Get the organization ID from the API key
  const { organizationId, errorResponse } =
    await getOrganizationFromApiKey(request);

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
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Extract validated data
    const validatedData: EmployeeCreateInput = validationResult.data;

    // Create the employee using the organization ID from the API key
    const employee = await db.employee.create({
      data: {
        ...validatedData,
        organizationId: organizationId!,
      },
    });

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
