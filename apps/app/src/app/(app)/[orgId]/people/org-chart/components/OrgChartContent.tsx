'use client';

import type { Edge, Node } from '@xyflow/react';
import { FindingScope } from '@db';

import { PeopleFindings } from '../../all/components/PeopleFindings';
import { OrgChartEditor } from './OrgChartEditor';
import { OrgChartEmptyState } from './OrgChartEmptyState';
import { OrgChartImageView } from './OrgChartImageView';
import type { OrgChartMember } from '../types';

interface OrgChartData {
  id: string;
  type: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  updatedAt: string;
  signedImageUrl: string | null;
}

interface OrgChartContentProps {
  chartData: OrgChartData | null;
  members: OrgChartMember[];
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  isAdminOrOwner: boolean;
}

export function OrgChartContent({
  chartData,
  members,
  isAuditor,
  isPlatformAdmin,
  isAdminOrOwner,
}: OrgChartContentProps) {
  const findingsSection = (
    <PeopleFindings
      scope={FindingScope.people_chart}
      isAuditor={isAuditor}
      isPlatformAdmin={isPlatformAdmin}
      isAdminOrOwner={isAdminOrOwner}
    />
  );

  // No chart exists yet - show empty state
  if (!chartData) {
    return (
      <div className="space-y-6">
        <OrgChartEmptyState members={members} />
        {findingsSection}
      </div>
    );
  }

  // Uploaded image mode
  if (chartData.type === 'uploaded' && chartData.signedImageUrl) {
    return (
      <div className="space-y-6">
        <OrgChartImageView
          imageUrl={chartData.signedImageUrl}
          chartName={chartData.name}
        />
        {findingsSection}
      </div>
    );
  }

  // Uploaded chart but image could not be loaded (e.g. S3 unavailable)
  if (chartData.type === 'uploaded') {
    return (
      <div className="space-y-6">
        <div className="flex h-[600px] items-center justify-center rounded-lg border border-border bg-background">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              The uploaded org chart image could not be loaded.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please try again later or re-upload the image.
            </p>
          </div>
        </div>
        {findingsSection}
      </div>
    );
  }

  // Interactive mode
  return (
    <div className="space-y-6">
      <OrgChartEditor
        initialNodes={chartData.nodes}
        initialEdges={chartData.edges}
        members={members}
        updatedAt={chartData.updatedAt ?? null}
      />
      {findingsSection}
    </div>
  );
}
