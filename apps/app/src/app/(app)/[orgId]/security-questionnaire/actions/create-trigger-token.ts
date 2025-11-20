"use server";

import { headers } from "next/headers";
import { auth as betterAuth } from "@/utils/auth";
import { auth } from "@trigger.dev/sdk";

// Create trigger token for auto-answer (can trigger and read)
export const createTriggerToken = async (
  taskId:
    | "parse-questionnaire"
    | "vendor-questionnaire-orchestrator"
    | "answer-question",
) => {
  const session = await betterAuth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  const orgId = session.session?.activeOrganizationId;
  if (!orgId) {
    return {
      success: false,
      error: "No active organization",
    };
  }

  try {
    const token = await auth.createTriggerPublicToken(taskId, {
      multipleUse: true,
      expirationTime: "1hr",
    });

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error("Error creating trigger token:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create trigger token",
    };
  }
};

// Create public token with read permissions for a specific run
export const createRunReadToken = async (runId: string) => {
  const session = await betterAuth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const token = await auth.createPublicToken({
      scopes: {
        read: {
          runs: [runId],
        },
      },
      expirationTime: "1hr",
    });

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error("Error creating run read token:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create run read token",
    };
  }
};
