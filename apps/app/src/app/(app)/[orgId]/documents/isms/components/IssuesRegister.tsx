'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import type { IsmsContextIssue, IsmsContextIssueKind } from '../isms-types';
import { AddIssueForm } from './AddIssueForm';
import { IssueRow } from './IssueRow';

interface IssuesRegisterProps {
  issues: IsmsContextIssue[];
  canEdit: boolean;
  onCreate: (params: {
    kind: IsmsContextIssueKind;
    description: string;
    effect: string;
  }) => Promise<void>;
  onUpdate: (params: {
    issueId: string;
    input: { description: string; effect: string };
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
    <div className="flex flex-col gap-3">
      <Text size="base" weight="semibold">
        {title}
      </Text>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed py-6 text-center">
          <Text variant="muted">No {kind} issues yet.</Text>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Effect on ISMS</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                canEdit={canEdit}
                onSave={({ description, effect }) =>
                  onUpdate({ issueId: issue.id, input: { description, effect } })
                }
                onDelete={() => onDelete(issue.id)}
              />
            ))}
          </TableBody>
        </Table>
      )}
      {canEdit && (
        <AddIssueForm
          kind={kind}
          onAdd={({ description, effect }) => onCreate({ kind, description, effect })}
        />
      )}
    </div>
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
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
