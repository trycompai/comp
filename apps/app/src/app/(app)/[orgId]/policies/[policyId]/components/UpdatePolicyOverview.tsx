'use client';

import { updatePolicyFormAction } from '@/actions/policies/update-policy-form-action';
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
import { useAction } from 'next-safe-action/hooks';
import { useMemo, useState } from 'react';
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

  const updatePolicyForm = useAction(updatePolicyFormAction, {
    onSuccess: () => {
      toast.success('Policy updated successfully');
      setIsSubmitting(false);
      onMutate?.();
    },
    onError: () => {
      toast.error('Failed to update policy');
      setIsSubmitting(false);
    },
  });

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

  const handleConfirmChanges = () => {
    if (!pendingChanges) return;

    setIsSubmitting(true);
    updatePolicyForm.execute({
      id: policy.id,
      status: pendingChanges.formData.status,
      assigneeId: pendingChanges.formData.assigneeId,
      department: pendingChanges.formData.department,
      review_frequency: pendingChanges.formData.reviewFrequency,
      review_date: pendingChanges.formData.reviewDate,
      approverId: null,
      entityId: policy.id,
    });
    setIsStatusChangeDialogOpen(false);
    setPendingChanges(null);
  };

  // Check if any form values have actually changed from their original values
  const hasFormChanges = useMemo(() => {
    const assigneeChanged = selectedAssigneeId !== policy.assigneeId;
    const departmentChanged = selectedDepartment !== (policy.department || Departments.admin);
    const frequencyChanged = selectedFrequency !== (policy.frequency || Frequency.monthly);
    
    return assigneeChanged || departmentChanged || frequencyChanged;
  }, [selectedAssigneeId, selectedDepartment, selectedFrequency, policy.assigneeId, policy.department, policy.frequency]);

  const isLoading = isSubmitting || updatePolicyForm.isExecuting;

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
