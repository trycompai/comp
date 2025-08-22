import { db } from '@db';
import { cache } from 'react';

export const getDoneTasks = cache(async (organizationId: string) => {
  const tasks = await db.task.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  const doneTasks = tasks.filter((t) => t.status === 'done');
  const incompleteTasks = tasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress' || t.status === 'not_relevant',
  );

  return {
    totalTasks: tasks.length,
    doneTasks: doneTasks.length,
    incompleteTasks,
  };
});
