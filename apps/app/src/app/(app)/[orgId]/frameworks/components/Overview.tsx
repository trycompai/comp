'use client';

import { Finding, FrameworkEditorFramework, Policy, Task } from '@db';
import { FrameworkInstanceWithControls } from '../types';
import { ComplianceOverview } from './ComplianceOverview';
import { DraggableCards } from './DraggableCards';
import { FindingsOverview } from './FindingsOverview';
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

export interface DocumentsScore {
  totalDocuments: number;
  completedDocuments: number;
  outstandingDocuments: number;
}

export interface FindingWithTarget extends Finding {
  task: {
    id: string;
    title: string;
  } | null;
  evidenceSubmission: {
    id: string;
    formType: string;
  } | null;
}

export interface OverviewProps {
  frameworksWithControls: FrameworkInstanceWithControls[];
  frameworksWithCompliance: FrameworkInstanceWithComplianceScore[];
  allFrameworks: FrameworkEditorFramework[];
  organizationId: string;
  publishedPoliciesScore: PublishedPoliciesScore;
  doneTasksScore: DoneTasksScore;
  documentsScore: DocumentsScore;
  peopleScore: PeopleScore;
  currentMember: { id: string; role: string } | null;
  onboardingTriggerJobId: string | null;
  findings: FindingWithTarget[];
}

export const Overview = ({
  frameworksWithControls,
  frameworksWithCompliance,
  allFrameworks,
  organizationId,
  publishedPoliciesScore,
  doneTasksScore,
  documentsScore,
  peopleScore,
  currentMember,
  onboardingTriggerJobId,
  findings,
}: OverviewProps) => {
  const overallComplianceScore = calculateOverallComplianceScore({
    publishedPolicies: publishedPoliciesScore.publishedPolicies,
    totalPolicies: publishedPoliciesScore.totalPolicies,
    doneTasks: doneTasksScore.doneTasks,
    totalTasks: doneTasksScore.totalTasks,
    completedDocuments: documentsScore.completedDocuments,
    totalDocuments: documentsScore.totalDocuments,
    completedMembers: peopleScore.completedMembers,
    totalMembers: peopleScore.totalMembers,
  });

  return (
    <DraggableCards>
      <ComplianceOverview
        organizationId={organizationId}
        overallComplianceScore={overallComplianceScore}
        totalPolicies={publishedPoliciesScore.totalPolicies}
        publishedPolicies={publishedPoliciesScore.publishedPolicies}
        totalTasks={doneTasksScore.totalTasks}
        doneTasks={doneTasksScore.doneTasks}
        totalDocuments={documentsScore.totalDocuments}
        completedDocuments={documentsScore.completedDocuments}
        totalMembers={peopleScore.totalMembers}
        completedMembers={peopleScore.completedMembers}
      />
      <FrameworksOverview
        frameworksWithControls={frameworksWithControls}
        frameworksWithCompliance={frameworksWithCompliance}
        overallComplianceScore={overallComplianceScore}
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
        onboardingTriggerJobId={onboardingTriggerJobId}
      />
      <FindingsOverview findings={findings} organizationId={organizationId} />
    </DraggableCards>
  );
};

function calculateOverallComplianceScore({
  publishedPolicies,
  totalPolicies,
  doneTasks,
  totalTasks,
  completedDocuments,
  totalDocuments,
  completedMembers,
  totalMembers,
}: {
  publishedPolicies: number;
  totalPolicies: number;
  doneTasks: number;
  totalTasks: number;
  completedDocuments: number;
  totalDocuments: number;
  completedMembers: number;
  totalMembers: number;
}) {
  const rows = [
    { done: publishedPolicies, total: totalPolicies },
    { done: doneTasks, total: totalTasks },
    { done: completedDocuments, total: totalDocuments },
    { done: completedMembers, total: totalMembers },
  ];
  const rowsWithData = rows.filter((row) => row.total > 0);
  if (rowsWithData.length === 0) return 0;

  const sumPercentages = rowsWithData.reduce((sum, row) => {
    return sum + Math.round((row.done / row.total) * 100);
  }, 0);

  return Math.round(sumPercentages / rowsWithData.length);
}
