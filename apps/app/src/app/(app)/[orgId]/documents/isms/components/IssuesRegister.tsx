'use client';

import { Stack } from '@trycompai/design-system';
import { WarningAlt } from '@trycompai/design-system/icons';
import type { IsmsContextIssue, IsmsContextIssueKind } from '../isms-types';
import { IsmsRegisterShell } from './shared';
import { AddIssueForm } from './AddIssueForm';
import { IssueRow } from './IssueRow';

interface IssuesRegisterProps {
  issues: IsmsContextIssue[];
  canEdit: boolean;
  onCreate: (params: {
    kind: IsmsContextIssueKind;
    category: string;
    description: string;
    effect: string;
  }) => Promise<void>;
  onUpdate: (params: {
    issueId: string;
    input: { category: string; description: string; effect: string };
  }) => Promise<void>;
  onDelete: (issueId: string) => Promise<void>;
}

function KindSection({
  kind,
  title,
  issues,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
}: {
  kind: IsmsContextIssueKind;
  title: string;
} & Pick<IssuesRegisterProps, 'issues' | 'canEdit' | 'onCreate' | 'onUpdate' | 'onDelete'>) {
  const rows = issues.filter((issue) => issue.kind === kind);

  return (
    <IsmsRegisterShell
      title={title}
      count={rows.length}
      emptyIcon={WarningAlt}
      emptyTitle={`No ${kind} issues yet`}
      emptyDescription={`Capture the ${kind} issues relevant to your ISMS and how each affects its objectives.`}
      footer={
        canEdit ? (
          <AddIssueForm
            kind={kind}
            onAdd={({ category, description, effect }) =>
              onCreate({ kind, category, description, effect })
            }
          />
        ) : undefined
      }
    >
      <Stack gap="2">
        {rows.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            canEdit={canEdit}
            onSave={({ category, description, effect }) =>
              onUpdate({
                issueId: issue.id,
                input: { category, description, effect },
              })
            }
            onDelete={() => onDelete(issue.id)}
          />
        ))}
      </Stack>
    </IsmsRegisterShell>
  );
}

export function IssuesRegister({
  issues,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
}: IssuesRegisterProps) {
  const safeIssues = Array.isArray(issues) ? issues : [];

  return (
    <Stack gap="8">
      <KindSection
        kind="internal"
        title="Internal Issues"
        issues={safeIssues}
        canEdit={canEdit}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      <KindSection
        kind="external"
        title="External Issues"
        issues={safeIssues}
        canEdit={canEdit}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </Stack>
  );
}
