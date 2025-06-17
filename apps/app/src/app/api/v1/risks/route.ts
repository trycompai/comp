import { getOrganizationFromApiKey } from '@/lib/api-key';
import { db } from '@comp/db';
import { Departments, Impact, Likelihood, RiskCategory, RiskStatus } from '@comp/db/types';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Configure this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

// Define the schema for query parameters
const queryParamsSchema = z.object({
  status: z.nativeEnum(RiskStatus).optional(),
  category: z.nativeEnum(RiskCategory).optional(),
  department: z.nativeEnum(Departments).optional(),
  search: z.string().optional(),
});

// Define the schema for risk creation
const riskCreateSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  category: z.nativeEnum(RiskCategory),
  department: z.nativeEnum(Departments).optional(),
  status: z.nativeEnum(RiskStatus).optional().default(RiskStatus.open),
  likelihood: z.nativeEnum(Likelihood).optional().default(Likelihood.very_unlikely),
  impact: z.nativeEnum(Impact).optional().default(Impact.insignificant),
  residualLikelihood: z.nativeEnum(Likelihood).optional().default(Likelihood.very_unlikely),
  residualImpact: z.nativeEnum(Impact).optional().default(Impact.insignificant),
  assigneeId: z.string().optional().nullable(),
});

// Type for the validated risk creation data
type RiskCreateInput = z.infer<typeof riskCreateSchema>;

/**
 * GET /api/v1/risks
 *
 * Get all risks for the organization associated with the API key
 *
 * Headers:
 * - Authorization: Bearer {api_key} or X-API-Key: {api_key}
 *
 * Query Parameters:
 * - status: string - Filter by risk status (optional)
 * - category: string - Filter by risk category (optional)
 * - department: string - Filter by department (optional)
 * - search: string - Search by title (optional)
 *
 * Returns:
 * - 200: { success: true, data: Risk[] }
 * - 401: { error: "Invalid or missing API key" }
 * - 400: { error: "Validation failed", details: {...} }
 * - 500: { error: "Failed to fetch risks" }
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
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      department: searchParams.get('department') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Validate query parameters
    const validationResult = queryParamsSchema.safeParse(queryParamsObj);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    // Extract validated query parameters
    const { status, category, department, search } = validationResult.data;

    // Build the where clause
    const where: any = {
      organizationId: organizationId!,
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add category filter if provided
    if (category) {
      where.category = category;
    }

    // Add department filter if provided
    if (department) {
      where.department = department;
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Fetch risks
    const risks = await db.risk.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        department: true,
        status: true,
        likelihood: true,
        impact: true,
        residualLikelihood: true,
        residualImpact: true,
        createdAt: true,
        updatedAt: true,
        assigneeId: true,
        assignee: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format dates for JSON response
    const formattedRisks = risks.map((risk) => ({
      ...risk,
      createdAt: risk.createdAt.toISOString(),
      updatedAt: risk.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: formattedRisks });
  } catch (error) {
    console.error('Error fetching risks:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch risks' }, { status: 500 });
  }
}

/**
 * POST /api/v1/risks
 *
 * Create a new risk for the organization associated with the API key
 *
 * Headers:
 * - Authorization: Bearer {api_key} or X-API-Key: {api_key}
 *
 * Body:
 * - title: string - The title of the risk (required)
 * - description: string - The description of the risk (required)
 * - category: RiskCategory - The category of the risk (required)
 * - department: Departments - The department associated with the risk (optional)
 * - status: RiskStatus - The status of the risk (optional, defaults to "open")
 * - likelihood: Likelihood - The likelihood score (optional, defaults to "very_unlikely")
 * - impact: Impact - The impact score (optional, defaults to "insignificant")
 * - residualLikelihood: Likelihood - The residual likelihood score (optional, defaults to "very_unlikely")
 * - residualImpact: Impact - The residual impact score (optional, defaults to "insignificant")
 * - assigneeId: string - The ID of the user who owns the risk (optional)
 *
 * Returns:
 * - 200: { success: true, data: Risk }
 * - 400: { success: false, error: "Validation failed", details: {...} }
 * - 401: { success: false, error: "Invalid or missing API key" }
 * - 500: { success: false, error: "Failed to create risk" }
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
    const validationResult = riskCreateSchema.safeParse(body);

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
    const validatedData: RiskCreateInput = validationResult.data;

    // Create the risk using the organization ID from the API key
    const risk = await db.risk.create({
      data: {
        ...validatedData,
        organizationId: organizationId!,
      },
    });

    // Format dates for JSON response
    const formattedRisk = {
      ...risk,
      createdAt: risk.createdAt.toISOString(),
      updatedAt: risk.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: formattedRisk,
    });
  } catch (error) {
    console.error('Error creating risk:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create risk',
      },
      { status: 500 },
    );
  }
}
