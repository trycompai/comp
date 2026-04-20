'use client';

import type {
  Control,
  FrameworkEditorFramework,
  FrameworkEditorRequirement,
  FrameworkInstance,
  Policy,
  RequirementMap,
  Task,
} from '@db';
import {
  PageHeader,
  PageHeaderActions,
  PageLayout,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { useState } from 'react';
import { PoliciesTable } from '@/app/(app)/[orgId]/controls/[controlId]/components/PoliciesTable';
import { TasksTable } from '@/app/(app)/[orgId]/controls/[controlId]/components/TasksTable';
import { DocumentsTable } from './DocumentsTable';
import { LinkDocumentTypeSheet } from './LinkDocumentTypeSheet';
import { LinkPolicySheet } from './LinkPolicySheet';
import { LinkTaskSheet } from './LinkTaskSheet';

interface DocumentRow {
  formType: string;
  submissionCount: number;
}

type ControlDetail = Control & {
  policies: Policy[];
  tasks: Task[];
  controlDocumentTypes?: { formType: string }[];
  requirementsMapped: (RequirementMap & {
    frameworkInstance: FrameworkInstance & {
      framework: FrameworkEditorFramework;
    };
    requirement: FrameworkEditorRequirement;
  })[];
};

interface Breadcrumb {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface Props {
  orgId: string;
  control: ControlDetail;
  breadcrumbs: Breadcrumb[];
  documentRows: DocumentRow[];
}

export function FrameworkControlShell({
  orgId,
  control,
  breadcrumbs,
  documentRows,
}: Props) {
  const [activeTab, setActiveTab] = useState('policies');

  const linkedPolicyIds = control.policies.map((p) => p.id);
  const linkedTaskIds = control.tasks.map((t) => t.id);
  const linkedFormTypes = (control.controlDocumentTypes ?? []).map(
    (d) => d.formType,
  );

  const actions =
    activeTab === 'policies' ? (
      <LinkPolicySheet
        controlId={control.id}
        alreadyLinkedPolicyIds={linkedPolicyIds}
      />
    ) : activeTab === 'tasks' ? (
      <LinkTaskSheet
        controlId={control.id}
        alreadyLinkedTaskIds={linkedTaskIds}
      />
    ) : (
      <LinkDocumentTypeSheet
        controlId={control.id}
        alreadyLinkedFormTypes={linkedFormTypes}
      />
    );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <PageLayout
        header={
          <PageHeader title={control.name} breadcrumbs={breadcrumbs}>
            <PageHeaderActions>{actions}</PageHeaderActions>
          </PageHeader>
        }
      >
        <Stack gap="lg">
          <TabsList variant="underline">
            <TabsTrigger value="policies">
              Policies ({control.policies.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks ({control.tasks.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents ({documentRows.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies">
            <PoliciesTable policies={control.policies} orgId={orgId} />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTable tasks={control.tasks} orgId={orgId} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTable
              controlId={control.id}
              orgId={orgId}
              rows={documentRows}
            />
          </TabsContent>
        </Stack>
      </PageLayout>
    </Tabs>
  );
}
