'use client';

import { useApi } from '@/hooks/use-api';
import { SelectAssignee } from '@/components/SelectAssignee';
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

type PolicyWithVersion = Policy & {
  currentVersion?: (PolicyVersion & { publishedBy: (Member & { user: User }) | null }) | null;
  approver: (Member & { user: User }) | null;
};

interface UpdatePolicyOverviewProps {
  policy: PolicyWithVersion;
  assignees: (Member & { user: User })[];
  isPendingApproval: boolean;
  onMutate?: () => void;
}

export function UpdatePolicyOverview({
  policy,
  assignees,
  isPendingApproval,
  onMutate,
}: UpdatePolicyOverviewProps) {
  const api = useApi();
  const router = useRouter();
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isSetActiveApprovalDialogOpen, setIsSetActiveApprovalDialogOpen] = useState(false);
  const [versionApprovalApproverId, setVersionApprovalApproverId] = useState<string | null>(null);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
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

  // Display the current policy status from the database
  // This always reflects the actual status stored in the Policy table
  const displayStatus = policy.status ?? PolicyStatus.draft;
  
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

    const assigneeId = selectedAssigneeId;
    const department = selectedDepartment;
    const reviewFrequency = selectedFrequency;
    const reviewDate = policy.reviewDate ? new Date(policy.reviewDate) : new Date();

    // Show confirmation dialog with list of changes
    const assigneeChanged = assigneeId !== policy.assigneeId;
    const departmentChanged = department !== policy.department;
    const frequencyChanged = reviewFrequency !== policy.frequency;

    setPendingChanges({
      assigneeId: assigneeChanged ? { from: policy.assigneeId, to: assigneeId } : null,
      department: departmentChanged ? { from: policy.department, to: department } : null,
      reviewFrequency: frequencyChanged ? { from: policy.frequency, to: reviewFrequency } : null,
      formData: { assigneeId, department, reviewFrequency, reviewDate, status: policy.status },
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
    const assigneeChanged = selectedAssigneeId !== policy.assigneeId;
    const departmentChanged = selectedDepartment !== (policy.department || Departments.admin);
    const frequencyChanged = selectedFrequency !== (policy.frequency || Frequency.monthly);
    
    return assigneeChanged || departmentChanged || frequencyChanged;
  }, [selectedAssigneeId, selectedDepartment, selectedFrequency, policy.assigneeId, policy.department, policy.frequency]);

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
            {/* Hidden status field for form submission */}
            <input type="hidden" name="status" id="status" value={displayStatus} />

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
                Save
              </Button>
            </HStack>
          )}
        </Stack>
      </form>

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
    </>
  );
}
