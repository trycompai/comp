"use server";

import { db } from "@bubba/db";
import { Prisma } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import { auth } from "@/auth";
import { 
  appErrors, 
  type CloudTestResult,
  type ActionResponse 
} from "./types";

export async function getCloudTestDetails(input: { testId: string }): Promise<ActionResponse<CloudTestResult>> {
  const { testId } = input;

  const session = await auth();
  const organizationId = session?.user.organizationId;

  if (!organizationId) {
    throw new Error("Organization ID not found");
  }

  try {
    // Using raw SQL query to get the result since the Prisma client property name is causing issues
    const results = await db.$queryRaw<any[]>`
      SELECT r.*, i.id as "integrationId", i.name as "integrationName", 
             i.integration_id, i.settings, i.user_settings
      FROM "Organization_integration_results" r
      JOIN "OrganizationIntegrations" i ON r."organizationIntegrationId" = i.id
      WHERE r.id = ${testId} AND r."organizationId" = ${organizationId}
      LIMIT 1
    `;

    if (!results || results.length === 0) {
      return {
        success: false,
        error: appErrors.NOT_FOUND,
      };
    }

    const integrationResult = results[0];

    // Create a placeholder user object since the schema doesn't have user info anymore
    const placeholderUser = {
      id: session.user.id,
      name: session.user.name || null,
      email: session.user.email || null,
    };

    // Format the result to match the expected CloudTestResult structure
    const result: CloudTestResult = {
      id: integrationResult.id,
      title: integrationResult.title || integrationResult.integrationName,
      description: typeof integrationResult.resultDetails === 'object' && integrationResult.resultDetails 
        ? (integrationResult.resultDetails as any).description || "" 
        : "",
      provider: integrationResult.integration_id,
      status: integrationResult.status,
      config: integrationResult.settings,
      authConfig: integrationResult.user_settings,
      createdAt: integrationResult.completedAt || new Date(),
      updatedAt: integrationResult.completedAt || new Date(),
      // Use placeholder user to match the required type
      createdBy: placeholderUser,
      updatedBy: placeholderUser,
      // Since we're looking at a single result entry
      runs: [{
        id: integrationResult.id,
        status: integrationResult.status,
        result: integrationResult.label,
        resultDetails: integrationResult.resultDetails,
        startedAt: integrationResult.completedAt, // Use completedAt as a fallback
        completedAt: integrationResult.completedAt,
        executedBy: placeholderUser, // Use placeholder user object
        createdAt: integrationResult.completedAt || new Date(),
        updatedAt: integrationResult.completedAt || new Date(),
      }],
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching integration result details:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
} 