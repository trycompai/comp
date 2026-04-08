'use client';

import { useState } from 'react';
import { Finding, FrameworkEditorFramework, Policy, Task } from '@db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import type { Timeline } from '@/hooks/use-timelines';
import { ComplianceOverview } from './ComplianceOverview';
import { FindingsOverview } from './FindingsOverview';
import { FrameworksOverview } from './FrameworksOverview';
import { TimelineOverview } from './TimelineOverview';
import { TimelineTeaser } from './TimelineTeaser';
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
  timelines: Timeline[];
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
  timelines,
}: OverviewProps) => {
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleSwitchToTimeline = () => setActiveTab('timeline');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList variant="underline">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="flex flex-col gap-6 pt-4">
          <TimelineTeaser timelines={timelines} onSwitchTab={handleSwitchToTimeline} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
          </div>
        </div>
      </TabsContent>

      <TabsContent value="timeline">
        <div className="pt-4">
          <TimelineOverview initialData={timelines} />
        </div>
      </TabsContent>
    </Tabs>
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
