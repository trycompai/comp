'use client';

import { useState } from 'react';
import { Button } from '@trycompai/design-system';
import { Add, Upload } from '@trycompai/design-system/icons';
import { OrgChartEditor } from './OrgChartEditor';
import { UploadOrgChartDialog } from './UploadOrgChartDialog';

interface Member {
  id: string;
  user: {
    name: string;
    email: string;
  };
  role: string;
  jobTitle?: string | null;
}

interface OrgChartEmptyStateProps {
  members: Member[];
}

export function OrgChartEmptyState({ members }: OrgChartEmptyStateProps) {
  const [mode, setMode] = useState<'empty' | 'create' | 'upload'>('empty');

  if (mode === 'create') {
    return (
      <OrgChartEditor
        initialNodes={[]}
        initialEdges={[]}
        members={members}
        updatedAt={null}
      />
    );
  }

  if (mode === 'upload') {
    return <UploadOrgChartDialog onClose={() => setMode('empty')} />;
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-full bg-muted p-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            className="text-muted-foreground"
          >
            <rect
              x="10"
              y="2"
              width="12"
              height="8"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x="2"
              y="22"
              width="10"
              height="8"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x="20"
              y="22"
              width="10"
              height="8"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M16 10V16M16 16H7V22M16 16H25V22"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          No Org Chart Yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create an interactive organization chart or upload an existing one to
          use as evidence for auditors.
        </p>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button
          iconLeft={<Add size={16} />}
          onClick={() => setMode('create')}
        >
          Create Org Chart
        </Button>
        <Button
          variant="outline"
          iconLeft={<Upload size={16} />}
          onClick={() => setMode('upload')}
        >
          Upload Image
        </Button>
      </div>
    </div>
  );
}
