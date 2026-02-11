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
