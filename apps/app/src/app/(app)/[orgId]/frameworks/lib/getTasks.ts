import { db } from '@db';
import { cache } from 'react';
import { countStrictlyCompletedTasks, isTaskStrictlyComplete } from './taskEvidenceDocumentsScore';

export const getDoneTasks = cache(async (organizationId: string) => {
  const tasks = await db.task.findMany({
    where: {
      organizationId,
    },
    include: {
      evidenceAutomations: {
        select: {
          isEnabled: true,
          runs: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              status: true,
              success: true,
              evaluationStatus: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const doneTasksCount = countStrictlyCompletedTasks(tasks);
  const incompleteTasks = tasks.filter((task) => !isTaskStrictlyComplete(task));

  return {
    totalTasks: tasks.length,
    doneTasks: doneTasksCount,
    incompleteTasks,
  };
});
