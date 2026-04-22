'use client';

import { useFrameworkVersions } from '@/hooks/use-framework-versions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';

interface VersionListProps {
  frameworkId: string;
}

export function VersionList({ frameworkId }: VersionListProps) {
  const { data: versions, isLoading, error } = useFrameworkVersions(frameworkId);

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
    <Table variant="bordered">
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
          <TableRow key={v.id}>
            <TableCell>
              <Text size="sm" weight="medium">
                v{v.version}
              </Text>
            </TableCell>
            <TableCell>
              <Text size="sm" variant="muted">
                {new Date(v.publishedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </TableCell>
            <TableCell>
              <Text size="sm" variant="muted">
                {v.publishedById ?? '—'}
              </Text>
            </TableCell>
            <TableCell>
              <Text size="sm" variant="muted">
                {v.releaseNotes
                  ? v.releaseNotes.length > 80
                    ? `${v.releaseNotes.slice(0, 80)}…`
                    : v.releaseNotes
                  : '—'}
              </Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
