'use client';

import { Button } from '@comp/ui/button';
import { Dialog } from '@comp/ui/dialog';
import type { FrameworkEditorFramework } from '@db';
import { Control, Task } from '@db';
import { PlusIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import type { FrameworkInstanceWithControls } from '../types';
import { AddFrameworkModal } from './AddFrameworkModal';
import { FrameworkList } from './FrameworkList';
import type { FrameworkInstanceWithComplianceScore } from './types';

export interface FrameworksOverviewProps {
  frameworksWithControls: FrameworkInstanceWithControls[];
  tasks: (Task & { controls: Control[] })[];
  allFrameworks: FrameworkEditorFramework[];
  frameworksWithCompliance?: FrameworkInstanceWithComplianceScore[];
}

export function FrameworksOverview({
  frameworksWithControls,
  tasks,
  allFrameworks,
  frameworksWithCompliance,
}: FrameworksOverviewProps) {
  const params = useParams<{ orgId: string }>();
  const organizationId = params.orgId;
  const [isAddFrameworkModalOpen, setIsAddFrameworkModalOpen] = useState(false);

  const instancedFrameworkIds = frameworksWithControls.map((fw) => fw.frameworkId);
  const availableFrameworksToAdd = allFrameworks.filter(
    (fw) => !instancedFrameworkIds.includes(fw.id) && fw.visible,
  );

  return (
    <div className="space-y-4">
      <div className="grid w-full gap-4 select-none md:grid-cols-1">
        <FrameworkList
          frameworksWithCompliance={
            frameworksWithCompliance ??
            frameworksWithControls.map((fw) => ({ frameworkInstance: fw, complianceScore: 0 }))
          }
          tasks={tasks}
        />
        <div className="flex items-center justify-center">
          <Button onClick={() => setIsAddFrameworkModalOpen(true)} variant="outline">
            {'Add Framework'} <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Dialog open={isAddFrameworkModalOpen} onOpenChange={setIsAddFrameworkModalOpen}>
        {isAddFrameworkModalOpen && (
          <AddFrameworkModal
            onOpenChange={setIsAddFrameworkModalOpen}
            availableFrameworks={availableFrameworksToAdd}
            organizationId={organizationId}
          />
        )}
      </Dialog>
    </div>
  );
}
