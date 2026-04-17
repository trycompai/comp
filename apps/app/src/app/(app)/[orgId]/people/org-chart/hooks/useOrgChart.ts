'use client';

import { apiClient } from '@/lib/api-client';
import type { Edge, Node } from '@xyflow/react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

export interface OrgChartData {
  id: string;
  type: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  updatedAt: string;
  signedImageUrl: string | null;
}

interface OrgChartApiResponse {
  id: string;
  type: string;
  name?: string | null;
  nodes?: unknown;
  edges?: unknown;
  updatedAt: string;
  signedImageUrl: string | null;
}

function sanitize(raw: OrgChartApiResponse | null): OrgChartData | null {
  if (!raw) return null;

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];

  const nodes = (rawNodes as Record<string, unknown>[])
    .filter((n) => n && typeof n === 'object' && n.id)
    .map((n) => ({
      ...n,
      position:
        n.position &&
        typeof (n.position as Record<string, unknown>).x === 'number' &&
        typeof (n.position as Record<string, unknown>).y === 'number'
          ? n.position
          : { x: 0, y: 0 },
    })) as unknown as Node[];

  const edges = (rawEdges as Record<string, unknown>[])
    .filter((e) => e && typeof e === 'object' && e.source && e.target)
    .map((e, i) => ({
      ...e,
      id: e.id || `edge-${e.source}-${e.target}-${i}`,
    })) as unknown as Edge[];

  return {
    id: raw.id,
    type: raw.type,
    name: raw.name ?? '',
    nodes,
    edges,
    updatedAt: raw.updatedAt,
    signedImageUrl: raw.signedImageUrl ?? null,
  };
}

async function fetchOrgChart(): Promise<OrgChartData | null> {
  const res = await apiClient.get<OrgChartApiResponse | null>('/v1/org-chart');
  if (res.error) throw new Error(res.error);
  return sanitize(res.data ?? null);
}

export function useOrgChart() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data, error, isLoading, mutate } = useSWR<OrgChartData | null>(
    orgId ? ['people-org-chart', orgId] : null,
    fetchOrgChart,
    { revalidateOnFocus: false },
  );

  return {
    orgChart: data ?? null,
    isLoading,
    error,
    mutate,
  };
}
