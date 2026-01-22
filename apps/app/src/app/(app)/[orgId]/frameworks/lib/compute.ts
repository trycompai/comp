import type { Control, Task } from '@db';
import type { FrameworkInstanceWithControls } from '../types';

export interface FrameworkStats {
  totalPolicies: number;
  publishedPolicies: number;
  totalTasks: number;
  doneTasks: number;
  controlsCount: number;
  complianceScore: number; // 0-100
}

export function computeFrameworkStats(
  frameworkInstance: FrameworkInstanceWithControls,
  tasks: (Task & { controls: Control[] })[],
): FrameworkStats {
  const controls = frameworkInstance.controls ?? [];
  const controlsCount = controls.length;

  // Deduplicate policies by id across all controls
  const allPolicies = controls.flatMap((c) => c.policies || []);
  const uniquePoliciesMap = new Map<string, { id: string; status: string }>();
  for (const p of allPolicies) uniquePoliciesMap.set(p.id, p as any);
  const uniquePolicies = Array.from(uniquePoliciesMap.values());

  const totalPolicies = uniquePolicies.length;
  const publishedPolicies = uniquePolicies.filter((p) => p.status === 'published').length;
  const policyRatio = totalPolicies > 0 ? publishedPolicies / totalPolicies : 0;

  const controlIds = controls.map((c) => c.id);
  const frameworkTasks = tasks.filter((t) => t.controls.some((c) => controlIds.includes(c.id)));
  // Deduplicate tasks by id to avoid double counting across multiple controls
  const uniqueTaskMap = new Map<string, Task & { controls: Control[] }>();
  for (const t of frameworkTasks) uniqueTaskMap.set(t.id, t);
  const uniqueTasks = Array.from(uniqueTaskMap.values());
  const totalTasks = uniqueTasks.length;
  const doneTasks = uniqueTasks.filter((t) => t.status === 'done' || t.status === 'not_relevant').length;
  const taskRatio = totalTasks > 0 ? doneTasks / totalTasks : 1;

  const complianceScore = Math.round(((policyRatio + taskRatio) / 2) * 100);

  return {
    totalPolicies,
    publishedPolicies,
    totalTasks,
    doneTasks,
    controlsCount,
    complianceScore,
  };
}
