'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/ui';
import { useRouter } from 'next/navigation';
import type { FrameworkVersionListItem } from '../hooks/useFrameworkVersions';

interface VersionListProps {
  frameworkId: string;
  versions: FrameworkVersionListItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function VersionList({ frameworkId, versions, isLoading, error }: VersionListProps) {
  const router = useRouter();
  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading versions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Failed to load versions.
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        No versions published yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Published</TableHead>
          <TableHead>Publisher</TableHead>
          <TableHead>Release Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((v) => (
          <TableRow
            key={v.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => router.push(`/frameworks/${frameworkId}/versions/${v.id}`)}
          >
            <TableCell>
              <span className="text-sm font-medium">v{v.version}</span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {new Date(v.publishedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {v.publishedBy?.name || v.publishedBy?.email || '—'}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {v.releaseNotes
                  ? v.releaseNotes.length > 80
                    ? `${v.releaseNotes.slice(0, 80)}…`
                    : v.releaseNotes
                  : '—'}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
