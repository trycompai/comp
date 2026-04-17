'use client';

import type { Edge, Node } from '@xyflow/react';

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
}

export function OrgChartContent({ chartData, members }: OrgChartContentProps) {
  if (!chartData) {
    return <OrgChartEmptyState members={members} />;
  }

  if (chartData.type === 'uploaded' && chartData.signedImageUrl) {
    return (
      <OrgChartImageView
        imageUrl={chartData.signedImageUrl}
        chartName={chartData.name}
      />
    );
  }

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

  return (
    <OrgChartEditor
      initialNodes={chartData.nodes}
      initialEdges={chartData.edges}
      members={members}
      updatedAt={chartData.updatedAt ?? null}
    />
  );
}
