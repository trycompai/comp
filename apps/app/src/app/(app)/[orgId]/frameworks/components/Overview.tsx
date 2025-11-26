'use client';

import { FrameworkEditorFramework, Policy, Task } from '@db';
import { FrameworkInstanceWithControls } from '../types';
import { ComplianceOverview } from './ComplianceOverview';
import { DraggableCards } from './DraggableCards';
import { FrameworksOverview } from './FrameworksOverview';
import { ToDoOverview } from './ToDoOverview';
import { FrameworkInstanceWithComplianceScore } from './types';

export interface PublishedPoliciesScore {
  totalPolicies: number;
  publishedPolicies: number;
  draftPolicies: Policy[];
  policiesInReview: Policy[];
  unpublishedPolicies: Policy[];
}

export interface DoneTasksScore {
  totalTasks: number;
  doneTasks: number;
  incompleteTasks: Task[];
}

export interface PeopleScore {
  totalMembers: number;
  completedMembers: number;
}

export interface OverviewProps {
  frameworksWithControls: FrameworkInstanceWithControls[];
  frameworksWithCompliance: FrameworkInstanceWithComplianceScore[];
  allFrameworks: FrameworkEditorFramework[];
  organizationId: string;
  publishedPoliciesScore: PublishedPoliciesScore;
  doneTasksScore: DoneTasksScore;
  peopleScore: PeopleScore;
  currentMember: { id: string; role: string } | null;
}

export const Overview = ({
  frameworksWithControls,
  frameworksWithCompliance,
  allFrameworks,
  organizationId,
  publishedPoliciesScore,
  doneTasksScore,
  peopleScore,
  currentMember,
}: OverviewProps) => {
  return (
    <DraggableCards>
      <ComplianceOverview
        frameworks={frameworksWithControls}
        totalPolicies={publishedPoliciesScore.totalPolicies}
        publishedPolicies={publishedPoliciesScore.publishedPolicies}
        totalTasks={doneTasksScore.totalTasks}
        doneTasks={doneTasksScore.doneTasks}
        totalMembers={peopleScore.totalMembers}
        completedMembers={peopleScore.completedMembers}
      />
      <FrameworksOverview
        frameworksWithControls={frameworksWithControls}
        frameworksWithCompliance={frameworksWithCompliance}
        allFrameworks={allFrameworks}
        organizationId={organizationId}
      />
      <ToDoOverview
        totalPolicies={publishedPoliciesScore.totalPolicies}
        totalTasks={doneTasksScore.totalTasks}
        remainingPolicies={
          publishedPoliciesScore.totalPolicies - publishedPoliciesScore.publishedPolicies
        }
        remainingTasks={doneTasksScore.totalTasks - doneTasksScore.doneTasks}
        unpublishedPolicies={publishedPoliciesScore.unpublishedPolicies}
        incompleteTasks={doneTasksScore.incompleteTasks}
        policiesInReview={publishedPoliciesScore.policiesInReview}
        organizationId={organizationId}
        currentMember={currentMember}
      />
    </DraggableCards>
  );
};
