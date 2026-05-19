'use client';

import { CreateFindingSheet } from '@/app/(app)/[orgId]/overview/components/CreateFindingSheet';
import { api } from '@/lib/api-client';
import type { CreateFindingData } from '@/hooks/use-findings-api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Section,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import { EditFindingSheet } from './EditFindingSheet';
import { AdminFindingRow, getTargetLabel, type AdminFinding } from './AdminFindingRow';

export function FindingsTab({ orgId }: { orgId: string }) {
  const [findings, setFindings] = useState<AdminFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingFinding, setEditingFinding] = useState<AdminFinding | null>(null);
  const [deletingFinding, setDeletingFinding] = useState<AdminFinding | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    const res = await api.get<AdminFinding[]>(
      `/v1/admin/organizations/${orgId}/findings`,
    );
    if (res.data) setFindings(res.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void fetchFindings();
  }, [fetchFindings]);

  const handleStatusChange = async (findingId: string, newStatus: string) => {
    setUpdatingId(findingId);
    const res = await api.patch(
      `/v1/admin/organizations/${orgId}/findings/${findingId}`,
      { status: newStatus },
    );
    if (!res.error) {
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f)),
      );
    }
    setUpdatingId(null);
  };

  const adminCreateFn = useCallback(
    async (payload: CreateFindingData) => {
      const res = await api.post(
        `/v1/admin/organizations/${orgId}/findings`,
        payload,
      );
      if (res.error) throw new Error(res.error);
    },
    [orgId],
  );

  // Radix's AlertDialogAction auto-closes the dialog on click. We
  // preventDefault so the dialog stays open while the request is in flight,
  // and we only close it ourselves on success — keeping the confirm UI
  // mounted on error so the user can retry without re-opening the menu.
  const handleConfirmDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!deletingFinding || deleting) return;
    setDeleting(true);
    const res = await api.delete(
      `/v1/admin/organizations/${orgId}/findings/${deletingFinding.id}`,
    );
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Finding deleted');
      setFindings((prev) => prev.filter((f) => f.id !== deletingFinding.id));
      setDeletingFinding(null);
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading findings...
      </div>
    );
  }

  return (
    <>
      <Section
        title={`Findings (${findings.length})`}
        actions={
          <Button size="sm" iconLeft={<Add size={16} />} onClick={() => setShowForm(true)}>
            Log Finding
          </Button>
        }
      >
        {findings.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No findings for this organization.
          </div>
        ) : (
          <Table variant="bordered">
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...findings]
                .sort((a, b) => a.content.localeCompare(b.content))
                .map((finding) => (
                  <AdminFindingRow
                    key={finding.id}
                    finding={finding}
                    statusUpdating={updatingId === finding.id}
                    onStatusChange={handleStatusChange}
                    onEdit={setEditingFinding}
                    onDelete={setDeletingFinding}
                  />
                ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <CreateFindingSheet
        organizationId={orgId}
        open={showForm}
        onOpenChange={setShowForm}
        createFn={adminCreateFn}
        // Route picker queries to the admin org-scoped endpoints so we fetch
        // the target org's tasks/policies/vendors/etc. instead of the platform
        // admin's own session org. Target kinds without an admin-scoped
        // endpoint (risk, member, device) are hidden from the dropdown.
        endpointOverrides={{
          task: `/v1/admin/organizations/${orgId}/tasks`,
          policy: `/v1/admin/organizations/${orgId}/policies`,
          vendor: `/v1/admin/organizations/${orgId}/vendors`,
          // Document-type definitions are static metadata, not org-scoped.
          // The admin `/evidence-forms` endpoint returns a status map keyed
          // by form type, which `extractOptions` can't render as picker
          // options — fall back to the default static endpoint.
        }}
        disabledTargetKinds={['risk', 'member', 'device']}
        onSuccess={() => {
          void fetchFindings();
        }}
      />

      <EditFindingSheet
        orgId={orgId}
        finding={editingFinding}
        targetLabel={editingFinding ? getTargetLabel(editingFinding) : ''}
        onOpenChange={(open) => {
          if (!open) setEditingFinding(null);
        }}
        onSaved={(updated) => {
          setFindings((prev) =>
            prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)),
          );
          setEditingFinding(null);
        }}
      />

      <AlertDialog
        open={deletingFinding !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletingFinding(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete finding?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the finding and its activity history. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
