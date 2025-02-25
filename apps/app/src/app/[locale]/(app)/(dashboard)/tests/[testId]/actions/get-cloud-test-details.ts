"use server";

import { db } from "@bubba/db";
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
    const integrationRun = await db.organizationIntegrationRun.findUnique({
      where: {
        id: testId,
        organizationId,
      },
      include: {
        organizationIntegration: true,
        executedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!integrationRun) {
      return {
        success: false,
        error: appErrors.NOT_FOUND,
      };
    }

    // Format the result to match the expected CloudTestResult structure
    const result: CloudTestResult = {
      id: integrationRun.id,
      title: integrationRun.organizationIntegration.name,
      description: typeof integrationRun.resultDetails === 'object' && integrationRun.resultDetails 
        ? (integrationRun.resultDetails as any).description || "" 
        : "",
      provider: integrationRun.organizationIntegration.integration_id,
      status: integrationRun.status,
      config: integrationRun.organizationIntegration.settings,
      authConfig: integrationRun.organizationIntegration.user_settings,
      createdAt: integrationRun.createdAt,
      updatedAt: integrationRun.updatedAt,
      // Since we don't have created/updated by in the model, use executedBy for both
      createdBy: {
        id: integrationRun.executedBy.id,
        name: integrationRun.executedBy.name,
        email: integrationRun.executedBy.email,
      },
      updatedBy: {
        id: integrationRun.executedBy.id,
        name: integrationRun.executedBy.name,
        email: integrationRun.executedBy.email,
      },
      // Since we're looking at a single run, create a runs array with just this run
      runs: [{
        id: integrationRun.id,
        status: integrationRun.status,
        result: integrationRun.result,
        resultDetails: integrationRun.resultDetails,
        startedAt: integrationRun.startedAt,
        completedAt: integrationRun.completedAt,
        executedBy: {
          id: integrationRun.executedBy.id,
          name: integrationRun.executedBy.name,
          email: integrationRun.executedBy.email,
        },
        createdAt: integrationRun.createdAt,
        updatedAt: integrationRun.updatedAt,
      }],
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching integration run details:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
} 