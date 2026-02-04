'use client';

import { useApi } from '@/hooks/use-api';
import { SelectAssignee } from '@/components/SelectAssignee';
import { StatusIndicator } from '@/components/status-indicator';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import {
  Departments,
  Frequency,
  Member,
  PolicyStatus,
  User,
  type Policy,
  type PolicyVersion,
} from '@db';
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
  Grid,
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Calendar } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, History, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PublishVersionDialog } from './PublishVersionDialog';
import { SubmitApprovalDialog } from './SubmitApprovalDialog';

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

type PolicyWithVersion = Policy & {
  currentVersion?: (PolicyVersion & { publishedBy: (Member & { user: User }) | null }) | null;
  approver: (Member & { user: User }) | null;
};

interface UpdatePolicyOverviewProps {
  policy: PolicyWithVersion;
  assignees: (Member & { user: User })[];
  isPendingApproval: boolean;
  versions?: PolicyVersionWithPublisher[];
  onMutate?: () => void;
}

export function UpdatePolicyOverview({
  policy,
  assignees,
  isPendingApproval,
  versions = [],
  onMutate,
}: UpdatePolicyOverviewProps) {
  const api = useApi();
  const router = useRouter();
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isSetActiveApprovalDialogOpen, setIsSetActiveApprovalDialogOpen] = useState(false);
  const [versionApprovalApproverId, setVersionApprovalApproverId] = useState<string | null>(null);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [pendingSetActiveVersion, setPendingSetActiveVersion] = useState<PolicyVersionWithPublisher | null>(null);
  const [settingActive, setSettingActive] = useState<string | null>(null);
  
  // Selected version for viewing - defaults to active version
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    policy.currentVersionId ?? (versions.length > 0 ? versions[0].id : null)
  );
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);

  // Sync selectedVersionId when versions change (e.g., after regeneration)
  useEffect(() => {
    // If the currently selected version no longer exists, switch to current version
    const selectedVersionExists = versions.some((v) => v.id === selectedVersionId);
    if (!selectedVersionExists) {
      setSelectedVersionId(policy.currentVersionId ?? versions[0]?.id ?? null);
    }
  }, [versions, policy.currentVersionId, selectedVersionId]);
  
  // Version list state
  const [versionPage, setVersionPage] = useState(0);
  const [versionSortAsc, setVersionSortAsc] = useState(false); // false = newest first (desc)
  const [deleteVersionDialogOpen, setDeleteVersionDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<PolicyVersionWithPublisher | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  
  const VERSIONS_PER_PAGE = 5;

  const pinnedVersionIds = useMemo(
    () =>
      new Set(
        [policy.currentVersionId, policy.pendingVersionId].filter(
          Boolean
        ) as string[]
      ),
    [policy.currentVersionId, policy.pendingVersionId]
  );
  
  // Sort and paginate versions
  const sortedVersions = useMemo(() => {
    const sorted = [...versions].sort((a, b) => 
      versionSortAsc ? a.version - b.version : b.version - a.version
    );
    return sorted;
  }, [versions, versionSortAsc]);

  const unpinnedVersions = useMemo(() => {
    if (pinnedVersionIds.size === 0) {
      return sortedVersions;
    }
    return sortedVersions.filter((version) => !pinnedVersionIds.has(version.id));
  }, [sortedVersions, pinnedVersionIds]);
  
  const paginatedVersions = useMemo(() => {
    const start = versionPage * VERSIONS_PER_PAGE;
    return unpinnedVersions.slice(start, start + VERSIONS_PER_PAGE);
  }, [unpinnedVersions, versionPage]);
  
  const totalPages = Math.ceil(unpinnedVersions.length / VERSIONS_PER_PAGE);
  
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;
  const isSelectedVersionActive = selectedVersionId === policy.currentVersionId;
  const isSelectedVersionPending = selectedVersionId === policy.pendingVersionId;
  const [pendingChanges, setPendingChanges] = useState<{
    status: { from: PolicyStatus; to: PolicyStatus } | null;
    assigneeId: { from: string | null; to: string | null } | null;
    department: { from: Departments | null; to: Departments } | null;
    reviewFrequency: { from: Frequency | null; to: Frequency } | null;
    formData: {
      status: PolicyStatus;
      assigneeId: string | null;
      department: Departments;
      reviewFrequency: Frequency;
      reviewDate: Date;
    };
  } | null>(null);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);

  // Status reflects the selected version:
  // - Current published version shows 'published'
  // - All other versions show 'draft'
  const displayStatus = useMemo(() => {
    if (isSelectedVersionActive) {
      return PolicyStatus.published;
    }
    return PolicyStatus.draft;
  }, [isSelectedVersionActive]);
  
  const [selectedStatus, setSelectedStatus] = useState<PolicyStatus>(policy.status);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(policy.assigneeId);
  const [selectedDepartment, setSelectedDepartment] = useState<Departments>(
    policy.department || Departments.admin,
  );
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency>(
    policy.frequency || Frequency.monthly,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldsDisabled = isPendingApproval;

  // Replaced useAction hooks with useApi calls in handleConfirmChanges and handleConfirmApproval

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const status = selectedStatus;
    const assigneeId = selectedAssigneeId;
    const department = selectedDepartment;
    const reviewFrequency = selectedFrequency;
    const reviewDate = policy.reviewDate ? new Date(policy.reviewDate) : new Date();

    // Case 1: Moving to published (from draft/needs_review) - requires approval
    if (['draft', 'needs_review'].includes(policy.status) && status === 'published') {
      setIsApprovalDialogOpen(true);
      setIsSubmitting(false);
      return;
    }

    // Case 2: Any other changes - show confirmation dialog with list of changes
    const statusChanged = status !== policy.status;
    const assigneeChanged = assigneeId !== policy.assigneeId;
    const departmentChanged = department !== policy.department;
    const frequencyChanged = reviewFrequency !== policy.frequency;

    setPendingChanges({
      status: statusChanged ? { from: policy.status, to: status } : null,
      assigneeId: assigneeChanged ? { from: policy.assigneeId, to: assigneeId } : null,
      department: departmentChanged ? { from: policy.department, to: department } : null,
      reviewFrequency: frequencyChanged ? { from: policy.frequency, to: reviewFrequency } : null,
      formData: { assigneeId, department, reviewFrequency, reviewDate, status },
    });
    setIsStatusChangeDialogOpen(true);
    setIsSubmitting(false);
  };

  const handleConfirmChanges = async () => {
    if (!pendingChanges) return;

    setIsSubmitting(true);
    const response = await api.patch(`/v1/policies/${policy.id}`, {
      status: pendingChanges.formData.status,
      assigneeId: pendingChanges.formData.assigneeId,
      department: pendingChanges.formData.department,
      frequency: pendingChanges.formData.reviewFrequency,
      reviewDate: pendingChanges.formData.reviewDate,
    });
    setIsSubmitting(false);

    if (response.error) {
      toast.error('Failed to update policy');
    } else {
      toast.success('Policy updated successfully');
      onMutate?.();
    }

    setIsStatusChangeDialogOpen(false);
    setPendingChanges(null);
  };

  const handleConfirmApproval = async () => {
    if (!selectedApproverId) {
      toast.error('Approver is required.');
      return;
    }

    const assigneeId = selectedAssigneeId;
    const department = selectedDepartment;
    const reviewFrequency = selectedFrequency;
    const reviewDate = policy.reviewDate ? new Date(policy.reviewDate) : new Date();

    setIsSubmitting(true);
    const response = await api.patch(`/v1/policies/${policy.id}`, {
      status: PolicyStatus.needs_review,
      assigneeId,
      department,
      frequency: reviewFrequency,
      reviewDate,
      approverId: selectedApproverId,
    });
    setIsSubmitting(false);

    if (response.error) {
      toast.error('Failed to submit policy for approval.');
    } else {
      toast.success('Policy submitted for approval successfully!');
      setIsApprovalDialogOpen(false);
      setSelectedStatus('needs_review');
      onMutate?.();
    }
    setSelectedApproverId(null);
  };

  // Check if any form values have actually changed from their original values
  const hasFormChanges = useMemo(() => {
    const statusChanged = selectedStatus !== policy.status;
    const assigneeChanged = selectedAssigneeId !== policy.assigneeId;
    const departmentChanged = selectedDepartment !== (policy.department || Departments.admin);
    const frequencyChanged = selectedFrequency !== (policy.frequency || Frequency.monthly);
    
    return statusChanged || assigneeChanged || departmentChanged || frequencyChanged;
  }, [selectedStatus, selectedAssigneeId, selectedDepartment, selectedFrequency, policy.status, policy.assigneeId, policy.department, policy.frequency]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Request to set a version as active - may require approval
  const handleRequestSetActive = (version: PolicyVersionWithPublisher) => {
    // If policy requires approval (has an approver workflow), show approval dialog
    // For now, we'll show confirmation dialog and allow setting active
    setPendingSetActiveVersion(version);
    setIsSetActiveApprovalDialogOpen(true);
  };

  const handleConfirmSetActive = async () => {
    if (!pendingSetActiveVersion) return;

    // Check if approval is required (approver must be selected)
    if (!versionApprovalApproverId) {
      toast.error('Please select an approver');
      return;
    }

    const versionToPublish = pendingSetActiveVersion;
    setSettingActive(versionToPublish.id);

    const response = await api.post(
      `/v1/policies/${policy.id}/versions/${versionToPublish.id}/submit-for-approval`,
      { approverId: versionApprovalApproverId },
    );
    setSettingActive(null);

    if (response.error) {
      toast.error('Failed to submit version for approval');
      return;
    }

    toast.success(`Version ${versionToPublish.version} submitted for approval`);
    setPendingSetActiveVersion(null);
    setIsSetActiveApprovalDialogOpen(false);
    setVersionApprovalApproverId(null);
    onMutate?.();
    router.refresh();
  };

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;

    setIsDeletingVersion(true);
    const response = await api.delete(
      `/v1/policies/${policy.id}/versions/${versionToDelete.id}`,
    );
    setIsDeletingVersion(false);

    if (response.error) {
      toast.error('Failed to delete version');
      return;
    }

    toast.success(`Version ${versionToDelete.version} deleted`);

    // If we deleted the selected version, switch to another one
    if (selectedVersionId === versionToDelete.id) {
      const remainingVersions = versions.filter(v => v.id !== versionToDelete.id);
      setSelectedVersionId(policy.currentVersionId ?? remainingVersions[0]?.id ?? null);
    }

    setDeleteVersionDialogOpen(false);
    setVersionToDelete(null);
    onMutate?.();
    router.refresh();
  };


  let buttonText = 'Save';
  // Only show "Submit for Approval" when moving TO published from draft/needs_review
  if (['draft', 'needs_review'].includes(policy.status) && selectedStatus === 'published') {
    buttonText = 'Submit for Approval';
  }

  const isLoading = isSubmitting;

  return (
    <>
      <form id="policy-form" onSubmit={handleSubmit}>
        <Stack gap="md">
          <Grid cols={{ base: '1', md: '2' }} gap="4">
            {/* Workflow Status Field - reflects selected version */}
            <Stack gap="sm">
              <Label htmlFor="status">Workflow Status</Label>
              <input type="hidden" name="status" id="status" value={displayStatus} />
              <Select
                value={displayStatus}
                disabled={fieldsDisabled || isSelectedVersionPending}
                onValueChange={(value) => {
                  const newStatus = value as PolicyStatus;
                  
                  // If there's already a pending approval, don't allow changes
                  if (policy.pendingVersionId) {
                    toast.error('There is already a version pending approval. Please wait for it to be approved or rejected.');
                    return;
                  }
                  
                  // If trying to change from published and this is the only published version
                  if (isSelectedVersionActive && newStatus !== PolicyStatus.published) {
                    toast.error('You must publish another version before changing this status. There must always be one published version.');
                    return;
                  }
                  // If trying to set as published, use the publish version flow
                  if (newStatus === PolicyStatus.published && !isSelectedVersionActive) {
                    if (!selectedVersion) {
                      toast.error('No version selected to publish');
                      return;
                    }
                    handleRequestSetActive(selectedVersion);
                    return;
                  }
                  setSelectedStatus(newStatus);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status">
                    <StatusIndicator status={displayStatus} />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PolicyStatus).map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption}>
                      <StatusIndicator status={statusOption} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Stack>

            {/* Version Field */}
            <Stack gap="sm">
              <Label>Version</Label>
              <DropdownMenu open={isVersionDropdownOpen} onOpenChange={setIsVersionDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      {selectedVersion ? (
                        <>
                          <span className="font-medium">v{selectedVersion.version}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No version</span>
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[320px] max-h-[400px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => setIsPublishDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Create new version
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {versions.length > 0 ? (
                    <>
                      {/* Pinned versions - Published and Pending */}
                      {(policy.currentVersionId || policy.pendingVersionId) && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            Pinned
                          </div>
                          {(() => {
                            const publishedVersion = versions.find(v => v.id === policy.currentVersionId);
                            const pendingVersion = versions.find(v => v.id === policy.pendingVersionId);
                            const pinnedVersions = [publishedVersion, pendingVersion].filter(Boolean) as PolicyVersionWithPublisher[];
                            return pinnedVersions.map((version) => {
                              const isActive = version.id === policy.currentVersionId;
                              const isPending = version.id === policy.pendingVersionId;
                              const isSelected = version.id === selectedVersionId;
                              const publisher = version.publishedBy?.user;
                              return (
                                <div
                                  key={`pinned-${version.id}`}
                                  className={`px-2 py-2 hover:bg-muted/50 rounded-sm cursor-pointer border-l-2 ${isActive ? 'border-l-primary' : 'border-l-amber-500'} ${isSelected ? 'bg-muted/30' : ''}`}
                                  onClick={() => {
                                    setSelectedVersionId(version.id);
                                    setIsVersionDropdownOpen(false);
                                  }}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={publisher?.image || ''} alt={publisher?.name || 'User'} />
                                      <AvatarFallback className="text-[8px]">{getInitials(publisher?.name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">v{version.version}</span>
                                    {isActive && (
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0">Published</Badge>
                                    )}
                                    {isPending && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600">Pending</Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5 pl-7">
                                    {format(new Date(version.createdAt), 'MMM d, yyyy')}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      {/* All versions with pagination */}
                      <div className="px-2 py-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          All Versions ({versions.length})
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVersionSortAsc(!versionSortAsc);
                            setVersionPage(0);
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title={versionSortAsc ? 'Sorted oldest first' : 'Sorted newest first'}
                        >
                          <ArrowDownUp className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {paginatedVersions.map((version) => {
                        const isActive = version.id === policy.currentVersionId;
                        const isPending = version.id === policy.pendingVersionId;
                        const isSelected = version.id === selectedVersionId;
                        const canDelete = !isActive && !isPending;
                        const publisher = version.publishedBy?.user;
                        return (
                          <div
                            key={version.id}
                            className={`group px-2 py-2 hover:bg-muted/50 rounded-sm cursor-pointer ${isSelected ? 'bg-muted/30' : ''}`}
                            onClick={() => {
                              setSelectedVersionId(version.id);
                              setIsVersionDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage
                                    src={publisher?.image || ''}
                                    alt={publisher?.name || 'User'}
                                  />
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(publisher?.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">v{version.version}</span>
                                {isActive && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    Published
                                  </Badge>
                                )}
                                {isPending && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600">
                                    Pending
                                  </Badge>
                                )}
                              </div>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    // Close dropdown first, then open dialog
                                    setIsVersionDropdownOpen(false);
                                    setVersionToDelete(version);
                                    // Small delay to let dropdown close before opening dialog
                                    setTimeout(() => {
                                      setDeleteVersionDialogOpen(true);
                                    }, 100);
                                  }}
                                  className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete version"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 pl-7">
                              {format(new Date(version.createdAt), 'MMM d, yyyy')}
                              {version.changelog && ` · ${version.changelog}`}
                            </div>
                          </div>
                        );
                      })}
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2 py-2 border-t mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVersionPage(Math.max(0, versionPage - 1));
                            }}
                            disabled={versionPage === 0}
                            className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {versionPage + 1} / {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVersionPage(Math.min(totalPages - 1, versionPage + 1));
                            }}
                            disabled={versionPage >= totalPages - 1}
                            className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      <History className="h-5 w-5 mx-auto mb-1 opacity-50" />
                      No versions yet
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </Stack>

            {/* Review Frequency Field */}
            <Stack gap="sm">
              <Label htmlFor="review_frequency">Review Frequency</Label>
              <input type="hidden" name="review_frequency" value={selectedFrequency} />
              <Select
                value={selectedFrequency}
                disabled={fieldsDisabled}
                onValueChange={(value) => {
                  setSelectedFrequency(value as Frequency);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select review frequency">
                    {selectedFrequency.charAt(0).toUpperCase() + selectedFrequency.slice(1)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Frequency).map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Stack>

            {/* Department Field */}
            <Stack gap="sm">
              <Label htmlFor="department">Department</Label>
              <input type="hidden" name="department" value={selectedDepartment} />
              <Select
                value={selectedDepartment}
                disabled={fieldsDisabled}
                onValueChange={(value) => {
                  setSelectedDepartment(value as Departments);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department">
                    {selectedDepartment.charAt(0).toUpperCase() + selectedDepartment.slice(1)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Departments).map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Stack>

            {/* Assignee Field */}
            <Stack gap="sm">
              <Label htmlFor="assigneeId">Assignee</Label>
              <SelectAssignee
                assignees={assignees}
                onAssigneeChange={(id) => {
                  setSelectedAssigneeId(id);
                }}
                assigneeId={selectedAssigneeId || ''}
                disabled={fieldsDisabled}
                withTitle={false}
              />
            </Stack>

            {/* Review Date Field */}
            <Stack gap="sm">
              <Label htmlFor="review_date">Review Date</Label>
              <InputGroup>
                <InputGroupInput
                  id="review_date_display"
                  value={policy.reviewDate ? format(new Date(policy.reviewDate), 'PPP') : 'None'}
                  disabled
                  readOnly
                />
                <InputGroupAddon align="inline-end">
                  <Calendar size={16} />
                </InputGroupAddon>
              </InputGroup>
              <input
                type="hidden"
                id="review_date"
                name="review_date"
                value={
                  policy.reviewDate
                    ? new Date(policy.reviewDate).toISOString()
                    : new Date().toISOString()
                }
              />
            </Stack>
          </Grid>

          {!isPendingApproval && (
            <HStack justify="end">
              <Button
                disabled={!hasFormChanges || isLoading}
                loading={isLoading}
                onClick={(e) => {
                  e.preventDefault();
                  const form = document.getElementById('policy-form') as HTMLFormElement;
                  form.requestSubmit();
                }}
              >
                {buttonText}
              </Button>
            </HStack>
          )}
        </Stack>
      </form>

      <SubmitApprovalDialog
        isOpen={isApprovalDialogOpen}
        onOpenChange={setIsApprovalDialogOpen}
        assignees={assignees}
        selectedApproverId={selectedApproverId}
        onSelectedApproverIdChange={setSelectedApproverId}
        onConfirm={handleConfirmApproval}
        isSubmitting={isSubmitting}
      />

      <AlertDialog
        open={isStatusChangeDialogOpen}
        onOpenChange={(open) => {
          setIsStatusChangeDialogOpen(open);
          if (!open) setPendingChanges(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Policy Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to make the following changes to this policy:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Stack gap="0">
            {pendingChanges?.status && (
              <HStack justify="between" align="center">
                <Text size="sm" variant="muted">
                  Status
                </Text>
                <Text size="sm">
                  <Text as="span" size="sm" variant="muted">
                    {pendingChanges.status.from
                      .replace('_', ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  <Text as="span" size="sm" variant="muted">
                    {' → '}
                  </Text>
                  <Text as="span" size="sm" weight="medium">
                    {pendingChanges.status.to
                      .replace('_', ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </Text>
              </HStack>
            )}
            {pendingChanges?.assigneeId && (
              <HStack justify="between" align="center">
                <Text size="sm" variant="muted">
                  Assignee
                </Text>
                <Text size="sm">
                  <Text as="span" size="sm" variant="muted">
                    {assignees.find((a) => a.id === pendingChanges.assigneeId?.from)?.user.name ??
                      'Unassigned'}
                  </Text>
                  <Text as="span" size="sm" variant="muted">
                    {' → '}
                  </Text>
                  <Text as="span" size="sm" weight="medium">
                    {assignees.find((a) => a.id === pendingChanges.assigneeId?.to)?.user.name ??
                      'Unassigned'}
                  </Text>
                </Text>
              </HStack>
            )}
            {pendingChanges?.department && (
              <HStack justify="between" align="center">
                <Text size="sm" variant="muted">
                  Department
                </Text>
                <Text size="sm">
                  <Text as="span" size="sm" variant="muted">
                    {pendingChanges.department.from
                      ? pendingChanges.department.from.charAt(0).toUpperCase() +
                        pendingChanges.department.from.slice(1)
                      : ''}
                  </Text>
                  <Text as="span" size="sm" variant="muted">
                    {' → '}
                  </Text>
                  <Text as="span" size="sm" weight="medium">
                    {pendingChanges.department.to.charAt(0).toUpperCase() +
                      pendingChanges.department.to.slice(1)}
                  </Text>
                </Text>
              </HStack>
            )}
            {pendingChanges?.reviewFrequency && (
              <HStack justify="between" align="center">
                <Text size="sm" variant="muted">
                  Review Frequency
                </Text>
                <Text size="sm">
                  <Text as="span" size="sm" variant="muted">
                    {pendingChanges.reviewFrequency.from
                      ? pendingChanges.reviewFrequency.from.charAt(0).toUpperCase() +
                        pendingChanges.reviewFrequency.from.slice(1)
                      : ''}
                  </Text>
                  <Text as="span" size="sm" variant="muted">
                    {' → '}
                  </Text>
                  <Text as="span" size="sm" weight="medium">
                    {pendingChanges.reviewFrequency.to.charAt(0).toUpperCase() +
                      pendingChanges.reviewFrequency.to.slice(1)}
                  </Text>
                </Text>
              </HStack>
            )}
          </Stack>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChanges} loading={isSubmitting}>
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Create Version Dialog */}
      <PublishVersionDialog
        policyId={policy.id}
        currentVersionNumber={policy.currentVersion?.version}
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        onSuccess={(newVersionId) => {
          setSelectedVersionId(newVersionId);
          onMutate?.();
          router.refresh();
        }}
      />

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
