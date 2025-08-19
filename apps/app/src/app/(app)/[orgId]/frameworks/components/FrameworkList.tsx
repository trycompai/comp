'use client';

import { Control, Task } from '@db';
import { FrameworkCard } from './FrameworkCard';
import type { FrameworkInstanceWithComplianceScore } from './types';

export function FrameworkList({
  frameworksWithCompliance,
  tasks,
}: {
  frameworksWithCompliance: FrameworkInstanceWithComplianceScore[];
  tasks: (Task & { controls: Control[] })[];
}) {
  if (!frameworksWithCompliance.length) return null;

  return (
    <div className="space-y-6">
      {frameworksWithCompliance.map(({ frameworkInstance, complianceScore }) => (
        <FrameworkCard
          key={frameworkInstance.id}
          frameworkInstance={frameworkInstance}
          complianceScore={complianceScore}
          tasks={tasks}
        />
      ))}
    </div>
  );
}
