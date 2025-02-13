"use server";

import { db, type Policy, type User } from "@bubba/db";
import { authActionClient } from "../safe-action";
import { z } from "zod";
import type { ActionData } from "../types";
import type { InputJsonValue } from "@prisma/client/runtime/library";

const selectFrameworksSchema = z.object({
  frameworkIds: z.array(z.string()),
});

export const selectFrameworksAction = authActionClient
  .schema(selectFrameworksSchema)
  .metadata({
    name: "select-frameworks",
    track: {
      event: "select-frameworks",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }): Promise<ActionData<true>> => {
    const { frameworkIds } = parsedInput;
    const { user } = ctx;

    if (!user.organizationId) {
      return {
        error: "Not authorized - no organization found",
      };
    }

    try {
      await Promise.all([
        frameworkIds.map((frameworkId) =>
          createOrganizationFramework(user as User, frameworkId)
        ),
        createOrganizationPolicy(user as User, frameworkIds),
      ]);

      return {
        data: true,
      };
    } catch (error) {
      console.error("Error selecting frameworks:", error);
      return {
        error: "Failed to select frameworks",
      };
    }
  });

const createOrganizationFramework = async (user: User, frameworkId: string) => {
  if (!user.organizationId) {
    throw new Error("Not authorized - no organization found");
  }

  // Connect the framework to the organization.
  const organizationFramework = await db.organizationFramework.create({
    data: {
      organizationId: user.organizationId,
      frameworkId,
      status: "not_started",
    },
    select: {
      id: true,
    },
  });

  // For each framework we need to get the categories and controls.
  const framework = await db.framework.findUnique({
    where: { id: frameworkId },
  });

  if (!framework) {
    throw new Error("Framework not found");
  }

  const frameworkCategories = await db.frameworkCategory.findMany({
    where: { frameworkId },
    select: {
      id: true,
    },
  });

  // For each category we need to get the controls.
  const frameworkControls = await db.control.findMany({
    where: {
      frameworkCategoryId: {
        in: frameworkCategories.map((category) => category.id),
      },
    },
    select: {
      id: true,
    },
  });

  if (!user.organizationId) {
    throw new Error("Organization ID is required");
  }

  await db.organizationControl.createMany({
    data: frameworkControls.map((control) => ({
      organizationFrameworkId: organizationFramework.id,
      controlId: control.id,
      organizationId: user.organizationId!,
      status: "not_started",
    })),
  });
};

const createOrganizationPolicy = async (user: User, frameworkIds: string[]) => {
  if (!user.organizationId) {
    throw new Error("Not authorized - no organization found");
  }

  const policies = await db.policy.findMany();
  const policiesForFrameworks: Policy[] = [];

  for (const policy of policies) {
    const usedBy = policy.usedBy;
    if (!usedBy) {
      continue;
    }

    const usedByFrameworkIds = Object.keys(usedBy);

    if (
      usedByFrameworkIds.some((frameworkId) =>
        frameworkIds.includes(frameworkId)
      )
    ) {
      policiesForFrameworks.push(policy);
    }
  }

  const organizationPolicies = await db.organizationPolicy.createMany({
    data: policiesForFrameworks.map((policy) => ({
      organizationId: user.organizationId!,
      policyId: policy.id,
      status: "draft",
      content: policy.content as InputJsonValue[],
    })),
  });

  return organizationPolicies;
};
