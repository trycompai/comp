'use client';

import { FrameworkEditorFramework } from '@db';
import { FrameworkInstanceWithControls } from '../types';
import { ComplianceOverview } from './ComplianceOverview';
import { DraggableCards } from './DraggableCards';
import { FrameworksOverview } from './FrameworksOverview';
import { ToDoOverview } from './ToDoOverview';
import { FrameworkInstanceWithComplianceScore } from './types';

export interface PublishedPoliciesScore {
  totalPolicies: number;
  publishedPolicies: number;
  draftPolicies: {
    id: string;
    status: 'draft' | 'published' | 'needs_review';
    name: string;
  }[];
  policiesInReview: {
    id: string;
    status: 'draft' | 'published' | 'needs_review';
    name: string;
  }[];
  unpublishedPolicies: {
    id: string;
    status: 'draft' | 'published' | 'needs_review';
    name: string;
  }[];
}

export interface DoneTasksScore {
  totalTasks: number;
  doneTasks: number;
  incompleteTasks: {
    id: string;
    status: 'todo' | 'in_progress' | 'done' | 'not_relevant';
    title: string;
  }[];
}

export interface OverviewProps {
  frameworksWithControls: FrameworkInstanceWithControls[];
  frameworksWithCompliance: FrameworkInstanceWithComplianceScore[];
  allFrameworks: FrameworkEditorFramework[];
  organizationId: string;
  publishedPoliciesScore: PublishedPoliciesScore;
  doneTasksScore: DoneTasksScore;
}

export const Overview = ({
  frameworksWithControls,
  frameworksWithCompliance,
  allFrameworks,
  organizationId,
  publishedPoliciesScore,
  doneTasksScore,
}: OverviewProps) => {
  return (
    <DraggableCards>
      <ComplianceOverview
        frameworks={frameworksWithControls}
        totalPolicies={publishedPoliciesScore.totalPolicies}
        publishedPolicies={publishedPoliciesScore.publishedPolicies}
        totalTasks={doneTasksScore.totalTasks}
        doneTasks={doneTasksScore.doneTasks}
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
      />
    </DraggableCards>
  );
};
