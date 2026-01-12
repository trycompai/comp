'use client';

import { submitPolicyForApprovalAction } from '@/actions/policies/submit-policy-for-approval-action';
import { updatePolicyFormAction } from '@/actions/policies/update-policy-form-action';
import { SelectAssignee } from '@/components/SelectAssignee';
import { StatusIndicator } from '@/components/status-indicator';
import { Departments, Frequency, Member, type Policy, PolicyStatus, User } from '@db';
import {
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
} from '@trycompai/design-system';
import { Calendar } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { SubmitApprovalDialog } from './SubmitApprovalDialog';

interface UpdatePolicyOverviewProps {
  policy: Policy & {
    approver: (Member & { user: User }) | null;
  };
  assignees: (Member & { user: User })[];
  isPendingApproval: boolean;
}

export function UpdatePolicyOverview({
  policy,
  assignees,
  isPendingApproval,
}: UpdatePolicyOverviewProps) {
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] = useState<PolicyStatus>(policy.status);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(policy.assigneeId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInteracted, setFormInteracted] = useState(false);

  const fieldsDisabled = isPendingApproval;

  const updatePolicyForm = useAction(updatePolicyFormAction, {
    onSuccess: () => {
      toast.success('Policy updated successfully');
      setIsSubmitting(false);
      setFormInteracted(false);
      router.refresh();
    },
    onError: () => {
      toast.error('Failed to update policy');
      setIsSubmitting(false);
    },
  });

  const submitForApproval = useAction(submitPolicyForApprovalAction, {
    onSuccess: () => {
      toast.success('Policy submitted for approval successfully!');
      setIsSubmitting(false);
      setIsApprovalDialogOpen(false);
      setFormInteracted(false);
      setSelectedStatus('needs_review');
      router.refresh();
    },
    onError: () => {
      toast.error('Failed to submit policy for approval.');
      setIsSubmitting(false);
    },
  });

  const handleFormChange = () => {
    setFormInteracted(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const status = formData.get('status') as PolicyStatus;
    const assigneeId = selectedAssigneeId;
    const department = formData.get('department') as Departments;
    const reviewFrequency = formData.get('review_frequency') as Frequency;
    const reviewDate = policy.reviewDate ? new Date(policy.reviewDate) : new Date();

    const isPublishedWithChanges =
      policy.status === 'published' &&
      (status !== policy.status ||
        assigneeId !== policy.assigneeId ||
        department !== policy.department ||
        reviewFrequency !== policy.frequency ||
        (policy.reviewDate ? new Date(policy.reviewDate).toDateString() : '') !==
          reviewDate.toDateString());

    if (
      (['draft', 'needs_review'].includes(policy.status) && status === 'published') ||
      isPublishedWithChanges
    ) {
      setIsApprovalDialogOpen(true);
      setIsSubmitting(false);
    } else {
      updatePolicyForm.execute({
        id: policy.id,
        status,
        assigneeId,
        department,
        review_frequency: reviewFrequency,
        review_date: reviewDate,
        approverId: null,
        entityId: policy.id,
      });
    }
  };

  const handleConfirmApproval = () => {
    if (!selectedApproverId) {
      toast.error('Approver is required.');
      return;
    }

    const form = document.getElementById('policy-form') as HTMLFormElement;
    const formData = new FormData(form);
    const assigneeId = selectedAssigneeId;
    const department = formData.get('department') as Departments;
    const reviewFrequency = formData.get('review_frequency') as Frequency;
    const reviewDate = policy.reviewDate ? new Date(policy.reviewDate) : new Date();

    setIsSubmitting(true);
    submitForApproval.execute({
      id: policy.id,
      status: PolicyStatus.needs_review,
      assigneeId,
      department,
      review_frequency: reviewFrequency,
      review_date: reviewDate,
      approverId: selectedApproverId,
      entityId: policy.id,
    });
    setSelectedApproverId(null);
  };

  const hasFormChanges = formInteracted;

  let buttonText = 'Save';
  if (
    (['draft', 'needs_review'].includes(policy.status) && selectedStatus === 'published') ||
    (policy.status === 'published' && hasFormChanges)
  ) {
    buttonText = 'Submit for Approval';
  }

  const isLoading = isSubmitting || updatePolicyForm.isExecuting || submitForApproval.isExecuting;

  return (
    <>
      <form id="policy-form" onSubmit={handleSubmit}>
        <Stack gap="md">
          <Grid cols={{ base: '1', md: '2' }} gap="4">
            {/* Status Field */}
            <Stack gap="sm">
              <Label htmlFor="status">Status</Label>
              <input type="hidden" name="status" id="status" value={selectedStatus} />
              <Select
                value={selectedStatus}
                disabled={fieldsDisabled}
                onValueChange={(value) => {
                  setSelectedStatus(value as PolicyStatus);
                  handleFormChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status">
                    <StatusIndicator status={selectedStatus} />
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

            {/* Review Frequency Field */}
            <Stack gap="sm">
              <Label htmlFor="review_frequency">Review Frequency</Label>
              <Select
                name="review_frequency"
                defaultValue={policy.frequency || Frequency.monthly}
                disabled={fieldsDisabled}
                onValueChange={handleFormChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select review frequency" />
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
              <Select
                name="department"
                defaultValue={policy.department || Departments.admin}
                disabled={fieldsDisabled}
                onValueChange={handleFormChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Departments).map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept.toUpperCase()}
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
                  handleFormChange();
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
    </>
  );
}
