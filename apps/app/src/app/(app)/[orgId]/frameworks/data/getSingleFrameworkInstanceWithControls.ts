"use server";

import { db } from "@comp/db";
import type { FrameworkInstanceWithControls } from "../types";
import type { Control, PolicyStatus, RequirementMap } from "@comp/db/types";

export const getSingleFrameworkInstanceWithControls = async ({
  organizationId,
  frameworkInstanceId,
}: {
  organizationId: string;
  frameworkInstanceId: string;
}): Promise<FrameworkInstanceWithControls | null> => {
  const frameworkInstanceFromDb = await db.frameworkInstance.findUnique({
    where: {
      organizationId,
      id: frameworkInstanceId,
    },
    include: {
      framework: true,
      requirementsMapped: {
        include: {
          control: {
            include: {
              policies: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
              requirementsMapped: true,
            },
          },
        },
      },
    },
  });

  if (!frameworkInstanceFromDb) {
    return null;
  }

  const controlsMap = new Map<
    string,
    Control & {
      policies: Array<{ id: string; name: string; status: PolicyStatus }>;
      requirementsMapped: RequirementMap[];
    }
  >();

  frameworkInstanceFromDb.requirementsMapped.forEach((rm) => {
    if (rm.control) {
      const { requirementsMapped: _, ...controlData } = rm.control;
      if (!controlsMap.has(rm.control.id)) {
        controlsMap.set(rm.control.id, {
          ...controlData,
          policies: rm.control.policies || [],
          requirementsMapped: rm.control.requirementsMapped || [],
        });
      }
    }
  });
  const { requirementsMapped, ...restOfFi } = frameworkInstanceFromDb;

  return {
    ...restOfFi,
    controls: Array.from(controlsMap.values()),
  };
};
