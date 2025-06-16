"use client";

import { Control, Task } from "@comp/db/types";
import { FrameworkCard } from "./FrameworkCard";
import type { FrameworkInstanceWithControls } from "../types";

export function FrameworkList({
  frameworksWithControls,
  tasks,
}: {
  frameworksWithControls: FrameworkInstanceWithControls[];
  tasks: (Task & { controls: Control[] })[];
}) {
  if (!frameworksWithControls.length) return null;

  return (
    <div className="space-y-6">
      {frameworksWithControls.map((frameworkInstance) => (
        <FrameworkCard
          key={frameworkInstance.id}
          frameworkInstance={frameworkInstance}
          complianceScore={0}
          tasks={tasks}
        />
      ))}
    </div>
  );
}
