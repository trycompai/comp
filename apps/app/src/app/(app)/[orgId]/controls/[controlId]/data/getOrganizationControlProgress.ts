'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';

export interface ControlProgressResponse {
  total: number;
  completed: number;
  progress: number;
  byType: {
    [key: string]: {
      total: number;
      completed: number;
    };
  };
}

export const getOrganizationControlProgress = async (controlId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      error: 'Unauthorized',
    };
  }

  const orgId = session.session.activeOrganizationId;

  if (!orgId) {
    return {
      error: 'Unauthorized',
    };
  }

  // Get the control with its policies and tasks
  const control = await db.control.findUnique({
    where: {
      id: controlId,
    },
    include: {
      policies: true,
      tasks: true,
    },
  });

  if (!control) {
    return {
      error: 'Control not found',
    };
  }

  const policies = control.policies || [];
  const tasks = control.tasks || [];
  const progress: ControlProgressResponse = {
    total: policies.length + tasks.length,
    completed: 0,
    progress: 0,
    byType: {},
  };

  // Process policies
  for (const policy of policies) {
    const policyTypeKey = 'policy';
    // Initialize type counters if not exists
    if (!progress.byType[policyTypeKey]) {
      progress.byType[policyTypeKey] = {
        total: 0,
        completed: 0,
      };
    }

    progress.byType[policyTypeKey].total++;

    // Check completion based on policy status
    const isCompleted = policy.status === 'published';

    if (isCompleted) {
      progress.completed++;
      progress.byType[policyTypeKey].completed++;
    }
  }

  // Process tasks
  for (const task of tasks) {
    const taskTypeKey = 'task';
    // Initialize type counters if not exists
    if (!progress.byType[taskTypeKey]) {
      progress.byType[taskTypeKey] = {
        total: 0,
        completed: 0,
      };
    }

    progress.byType[taskTypeKey].total++;

    const isCompleted = task.status === 'done' || task.status === 'not_relevant';

    if (isCompleted) {
      progress.completed++;
      progress.byType[taskTypeKey].completed++;
    }
  }

  // Calculate overall progress percentage
  progress.progress =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return {
    data: {
      progress,
    },
  };
};
