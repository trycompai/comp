'use client';

import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { getDocumentTypeLabel, toDocumentUrlSlug } from './documentTypeLabels';

interface DocumentTypeRow {
  formType: string;
  submissionCount: number;
}

export function DocumentsTable({
  controlId,
  orgId,
  rows,
}: {
  controlId: string;
  orgId: string;
  rows: DocumentTypeRow[];
}) {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const canUpdate = hasPermission('control', 'update');

  const handleUnlink = async (formType: string) => {
    if (pending) return;
    setPending(formType);
    try {
      const response = await apiClient.delete(
        `/v1/controls/${controlId}/document-types/${formType}`,
      );
      if (response.error) throw new Error(response.error);
      toast.success('Document unlinked');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to unlink document',
      );
    } finally {
      setPending(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Text variant="muted">No required documents yet.</Text>
      </div>
    );
  }

  return (
    <Table variant="bordered">
      <TableHeader>
        <TableRow>
          <TableHead>Document Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submissions</TableHead>
          {canUpdate ? <TableHead /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const label = getDocumentTypeLabel(row.formType);
          const satisfied = row.submissionCount > 0;
          return (
            <TableRow
              key={row.formType}
              onClick={() =>
                router.push(
                  `/${orgId}/documents/${toDocumentUrlSlug(row.formType)}`,
                )
              }
              style={{ cursor: 'pointer' }}
            >
              <TableCell>
                <span
                  className="block max-w-[320px] truncate text-sm"
                  title={label}
                >
                  {label}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={satisfied ? 'default' : 'destructive'}>
                  {satisfied ? 'Submitted' : 'Missing'}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="tabular-nums text-sm">
                  {row.submissionCount}
                </span>
              </TableCell>
              {canUpdate ? (
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending !== null}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlink(row.formType);
                    }}
                  >
                    <TrashCan size={16} />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
