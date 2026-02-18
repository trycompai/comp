'use server';

import type { Control, PolicyStatus, RequirementMap } from '@db';
import { db } from '@db';
import type { FrameworkInstanceWithControls } from '../types';

export async function getAllFrameworkInstancesWithControls({
  organizationId,
}: {
  organizationId: string;
}): Promise<FrameworkInstanceWithControls[]> {
  const frameworkInstancesFromDb = await db.frameworkInstance.findMany({
    where: {
      organizationId,
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

  const frameworksWithControls: FrameworkInstanceWithControls[] = frameworkInstancesFromDb.map(
    (fi) => {
      const controlsMap = new Map<
        string,
        Control & {
          policies: Array<{
            id: string;
            name: string;
            status: PolicyStatus;
          }>;
          requirementsMapped: RequirementMap[];
        }
      >();

      for (const rm of fi.requirementsMapped) {
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
      }

      const { requirementsMapped, ...restOfFi } = fi;

      return {
        ...restOfFi,
        controls: Array.from(controlsMap.values()),
      };
    },
  );

  return frameworksWithControls;
}
