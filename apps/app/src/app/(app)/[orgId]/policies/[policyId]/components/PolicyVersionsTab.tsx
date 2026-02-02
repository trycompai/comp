'use client';

import { deleteVersionAction } from '@/actions/policies/delete-version';
import { submitVersionForApprovalAction } from '@/actions/policies/submit-version-for-approval';
import { SelectAssignee } from '@/components/SelectAssignee';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import type { Member, Policy, PolicyVersion, User } from '@db';
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
  HStack,
  Label,
  Stack,
  Text,
} from '@trycompai/design-system';
import { format } from 'date-fns';
import { Edit, FileText, MoreVertical, Plus, Trash2, Upload } from 'lucide-react';
import { ChevronLeft, ChevronRight } from '@trycompai/design-system/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

const VERSIONS_PER_PAGE = 10;
import { toast } from 'sonner';
import { PublishVersionDialog } from './PublishVersionDialog';

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

type PolicyWithVersion = Policy & {
  currentVersion?: (PolicyVersion & { publishedBy: (Member & { user: User }) | null }) | null;
  approver: (Member & { user: User }) | null;
};

interface PolicyVersionsTabProps {
  policy: PolicyWithVersion;
  versions: PolicyVersionWithPublisher[];
  assignees: (Member & { user: User })[];
  isPendingApproval: boolean;
  onMutate?: () => void;
}

export function PolicyVersionsTab({
  policy,
  versions,
  assignees,
  isPendingApproval,
  onMutate,
}: PolicyVersionsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [deleteVersionDialogOpen, setDeleteVersionDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<PolicyVersionWithPublisher | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [isSetActiveApprovalDialogOpen, setIsSetActiveApprovalDialogOpen] = useState(false);
  const [pendingSetActiveVersion, setPendingSetActiveVersion] = useState<PolicyVersionWithPublisher | null>(null);
  const [versionApprovalApproverId, setVersionApprovalApproverId] = useState<string | null>(null);
  const [settingActive, setSettingActive] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Sort versions: current version first, then pending, then by version number descending
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      // Current version first (whether draft or published)
      if (a.id === policy.currentVersionId) return -1;
      if (b.id === policy.currentVersionId) return 1;
      // Pending approval version second
      if (a.id === policy.pendingVersionId) return -1;
      if (b.id === policy.pendingVersionId) return 1;
      // Then by version number descending
      return b.version - a.version;
    });
  }, [versions, policy.currentVersionId, policy.pendingVersionId]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedVersions.length / VERSIONS_PER_PAGE);
  const paginatedVersions = useMemo(() => {
    const startIndex = (currentPage - 1) * VERSIONS_PER_PAGE;
    const endIndex = startIndex + VERSIONS_PER_PAGE;
    return sortedVersions.slice(startIndex, endIndex);
  }, [sortedVersions, currentPage]);

  // Reset to page 1 when versions change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRequestSetActive = (version: PolicyVersionWithPublisher) => {
    setPendingSetActiveVersion(version);
    setIsSetActiveApprovalDialogOpen(true);
  };

  const handleConfirmSetActive = async () => {
    if (!pendingSetActiveVersion) return;
    
    if (!versionApprovalApproverId) {
      toast.error('Please select an approver');
      return;
    }
    
    const versionToPublish = pendingSetActiveVersion;
    setSettingActive(versionToPublish.id);
    try {
      const result = await submitVersionForApprovalAction({
        policyId: policy.id,
        versionId: versionToPublish.id,
        approverId: versionApprovalApproverId,
        entityId: policy.id,
      });
      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to submit version for approval');
      }
      
      toast.success(`Version ${versionToPublish.version} submitted for approval`);
      setPendingSetActiveVersion(null);
      setIsSetActiveApprovalDialogOpen(false);
      setVersionApprovalApproverId(null);
      
      onMutate?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit version for approval');
    } finally {
      setSettingActive(null);
    }
  };

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;
    
    setIsDeletingVersion(true);
    try {
      const result = await deleteVersionAction({
        versionId: versionToDelete.id,
        policyId: policy.id,
      });
      
      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to delete version');
      }
      
      toast.success(`Version ${versionToDelete.version} deleted`);
      setDeleteVersionDialogOpen(false);
      setVersionToDelete(null);
      onMutate?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete version');
    } finally {
      setIsDeletingVersion(false);
    }
  };

  const handleEditVersion = (version: PolicyVersionWithPublisher) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'content');
    params.set('versionId', version.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <Stack gap="md">
        <HStack justify="between" align="center">
          <Text weight="semibold" size="lg">Version History</Text>
          <Button
            size="lg"
            onClick={() => setIsPublishDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Version
          </Button>
        </HStack>
        {sortedVersions.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <Text variant="muted">No versions yet</Text>
            <Text size="sm" variant="muted">
              Create a version to start tracking changes
            </Text>
          </div>
        ) : (
          <Stack gap="sm">
            {paginatedVersions.map((version) => {
              const isCurrentVersion = version.id === policy.currentVersionId;
              const isPendingVersion = version.id === policy.pendingVersionId;
              
              // Badge logic:
              // - Published: current version AND policy was ever published (has lastPublishedAt)
              //   This ensures the published version keeps its badge even during pending approval
              // - Pending Approval: this version is pending approval
              // - Draft: everything else (all versions that aren't published or pending)
              const isPublished = isCurrentVersion && !!policy.lastPublishedAt;
              const isDraft = !isPublished && !isPendingVersion;
              
              const canDelete = !isCurrentVersion && !isPendingVersion;
              // Can publish other versions (not current, not pending)
              const canPublishOther = !isCurrentVersion && !isPendingVersion && !isPendingApproval;
              // Can publish current version if it's in draft or needs_review status
              const canPublishCurrent = isCurrentVersion && (policy.status === 'draft' || policy.status === 'needs_review') && !isPendingApproval;
              const canPublish = canPublishOther || canPublishCurrent;
              const publisher = version.publishedBy?.user;

              // Determine border/background styling based on status
              const getBorderClass = () => {
                if (isPublished) return 'border-primary/50 bg-primary/5';
                if (isPendingVersion) return 'border-warning/50 bg-warning/5';
                return 'border-border';
              };

              return (
                <div
                  key={version.id}
                  className={`group flex items-center justify-between rounded-lg border py-2 px-3 ${getBorderClass()}`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={publisher?.image || ''}
                        alt={publisher?.name || 'User'}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(publisher?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1">
                      <HStack gap="md" align="center">
                        <Text weight="medium">v{version.version}</Text>
                        {isPublished && (
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary hover:bg-primary/10"
                          >
                            Published
                          </Badge>
                        )}
                        {isDraft && (
                          <Badge
                            variant="secondary"
                            className="border-warning/30 bg-warning/10 text-warning hover:bg-warning/10"
                          >
                            Draft
                          </Badge>
                        )}
                        {isPendingVersion && (
                          <Badge variant="outline" className="border-warning text-warning">
                            Pending Approval
                          </Badge>
                        )}
                      </HStack>
                      {version.changelog && (
                        <Text size="sm" variant="muted">
                          {version.changelog}
                        </Text>
                      )}
                      <Text size="xs" variant="muted">
                        Last updated: {format(new Date(version.updatedAt), 'MMM d, yyyy \'at\' h:mm a')}
                        {' by '}{publisher?.name || 'System'}
                      </Text>
                    </div>
                  </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canPublish && (
                          <DropdownMenuItem onClick={() => handleRequestSetActive(version)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEditVersion(version)}>
                          {isPublished ? (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              View
                            </>
                          ) : (
                            <>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </>
                          )}
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => {
                              setVersionToDelete(version);
                              setDeleteVersionDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                      </DropdownMenu>
                </div>
              );
            })}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-4 border-t border-border">
                <HStack justify="between" align="center">
                  <Text size="sm" variant="muted">
                    Showing {(currentPage - 1) * VERSIONS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * VERSIONS_PER_PAGE, sortedVersions.length)} of{' '}
                    {sortedVersions.length} versions
                  </Text>
                  <HStack gap="sm" align="center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </Button>
                    <Text size="sm" variant="muted">
                      Page {currentPage} of {totalPages}
                    </Text>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight size={16} />
                    </Button>
                  </HStack>
                </HStack>
              </div>
            )}
          </Stack>
        )}
      </Stack>

      {/* Create Version Dialog */}
      <PublishVersionDialog
        policyId={policy.id}
        currentVersionNumber={policy.currentVersion?.version}
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        onSuccess={() => {
          onMutate?.();
          router.refresh();
        }}
      />

      {/* Delete Version Dialog */}
      <AlertDialog open={deleteVersionDialogOpen} onOpenChange={setDeleteVersionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version {versionToDelete?.version}? This action cannot be undone.
              {versionToDelete?.pdfUrl && ' The associated PDF file will also be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVersionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              variant="destructive"
              loading={isDeletingVersion}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Version Approval Dialog */}
      <Dialog
        open={isSetActiveApprovalDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsSetActiveApprovalDialogOpen(false);
            setPendingSetActiveVersion(null);
            setVersionApprovalApproverId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Version {pendingSetActiveVersion?.version}</DialogTitle>
            <DialogDescription>
              Select an approver to review and publish version {pendingSetActiveVersion?.version}.
              Once approved, this version will become the active published version.
            </DialogDescription>
          </DialogHeader>
          <Stack gap="md">
            <Stack gap="sm">
              <Label htmlFor="version-approver">Approver</Label>
              <SelectAssignee
                assignees={assignees}
                onAssigneeChange={(id) => setVersionApprovalApproverId(id)}
                assigneeId={versionApprovalApproverId || ''}
                withTitle={false}
              />
            </Stack>
          </Stack>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSetActiveApprovalDialogOpen(false);
                setPendingSetActiveVersion(null);
                setVersionApprovalApproverId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSetActive}
              disabled={!!settingActive || !versionApprovalApproverId}
              loading={!!settingActive}
            >
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
