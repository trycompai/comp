'use client';

import type { Edge, Node } from '@xyflow/react';
import { OrgChartEditor } from './OrgChartEditor';
import { OrgChartEmptyState } from './OrgChartEmptyState';
import { OrgChartImageView } from './OrgChartImageView';

interface Member {
  id: string;
  user: {
    name: string;
    email: string;
  };
  role: string;
  jobTitle?: string | null;
}

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
  members: Member[];
}

export function OrgChartContent({
  chartData,
  members,
}: OrgChartContentProps) {
  // No chart exists yet - show empty state
  if (!chartData) {
    return <OrgChartEmptyState members={members} />;
  }

  // Uploaded image mode
  if (chartData.type === 'uploaded' && chartData.signedImageUrl) {
    return (
      <OrgChartImageView
        imageUrl={chartData.signedImageUrl}
        chartName={chartData.name}
      />
    );
  }

  // Uploaded chart but image could not be loaded (e.g. S3 unavailable)
  if (chartData.type === 'uploaded') {
    return (
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
    );
  }

  // Interactive mode
  return (
    <OrgChartEditor
      initialNodes={chartData.nodes}
      initialEdges={chartData.edges}
      members={members}
      updatedAt={chartData.updatedAt ?? null}
    />
  );
}
