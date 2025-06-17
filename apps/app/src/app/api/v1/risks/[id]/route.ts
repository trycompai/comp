import { getOrganizationFromApiKey } from '@/lib/api-key';
import { db } from '@comp/db';
import type {
  Departments,
  Impact,
  Likelihood,
  RiskCategory,
  RiskStatus,
  RiskTreatmentType,
} from '@comp/db/types';
import { type NextRequest, NextResponse } from 'next/server';

// Configure this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

/**
 * GET /api/v1/risks/:id
 *
 * Get a single risk by ID for the organization associated with the API key
 *
 * Headers:
 * - Authorization: Bearer {api_key} or X-API-Key: {api_key}
 *
 * Path Parameters:
 * - id: string - The ID of the risk to fetch
 *
 * Returns:
 * - 200: { success: true, data: Risk }
 * - 401: { success: false, error: "Invalid or missing API key" }
 * - 404: { success: false, error: "Risk not found" }
 * - 500: { success: false, error: "Failed to fetch risk" }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get the organization ID from the API key
  const { organizationId, errorResponse } = await getOrganizationFromApiKey(request);

  // If there's an error response, return it
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const riskId = (await params).id;

    // Fetch the risk
    const risk = await db.risk.findFirst({
      where: {
        id: riskId,
        organizationId: organizationId!,
      },
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
        treatmentStrategy: true,
        treatmentStrategyDescription: true,
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
    });

    // If risk not found, return 404
    if (!risk) {
      return NextResponse.json(
        {
          success: false,
          error: 'Risk not found',
        },
        { status: 404 },
      );
    }

    // Fetch tasks for this risk
    const tasks = await db.task.findMany({
      where: {
        risks: {
          some: {
            id: riskId,
          },
        },
        organizationId: organizationId!,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        assigneeId: true,
        assignee: {
          select: {
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
        createdAt: 'desc',
      },
    });

    // Format dates for JSON response
    const formattedRisk = {
      ...risk,
      createdAt: risk.createdAt.toISOString(),
      updatedAt: risk.updatedAt.toISOString(),
      tasks: tasks.map((task) => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json({
      success: true,
      data: formattedRisk,
    });
  } catch (error) {
    console.error('Error fetching risk:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch risk',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/risks/:id
 *
 * Delete a risk by ID for the organization associated with the API key
 *
 * Headers:
 * - Authorization: Bearer {api_key} or X-API-Key: {api_key}
 *
 * Path Parameters:
 * - id: string - The ID of the risk to delete
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
    const riskId = (await params).id;

    // Check if the risk exists and belongs to the organization
    const existingRisk = await db.risk.findFirst({
      where: {
        id: riskId,
        organizationId: organizationId!,
      },
    });

    if (!existingRisk) {
      return NextResponse.json(
        {
          success: false,
          error: 'Risk not found',
        },
        { status: 404 },
      );
    }

    // Delete the risk
    await db.risk.delete({
      where: {
        id: riskId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Risk deleted successfully',
      },
    });
  } catch (error) {
    console.error('Error deleting risk:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete risk',
      },
      { status: 500 },
    );
  }
}
