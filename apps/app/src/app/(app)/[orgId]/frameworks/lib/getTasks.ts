import { db } from '@db';
import { cache } from 'react';

export const getDoneTasks = cache(async (organizationId: string) => {
  const tasks = await db.task.findMany({
    where: {
      organizationId,
    },
  });

  const doneTasks = tasks.filter((t) => t.status === 'done' || t.status === 'not_relevant');
  const incompleteTasks = tasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  );

  return {
    totalTasks: tasks.length,
    doneTasks: doneTasks.length,
    incompleteTasks,
  };
});
