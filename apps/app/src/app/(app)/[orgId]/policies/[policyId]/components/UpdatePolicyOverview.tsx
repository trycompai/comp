'use client';

import { submitPolicyForApprovalAction } from '@/actions/policies/submit-policy-for-approval-action';
import { updatePolicyFormAction } from '@/actions/policies/update-policy-form-action';
import { SelectAssignee } from '@/components/SelectAssignee';
import { StatusIndicator } from '@/components/status-indicator';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Departments, Frequency, Member, type Policy, PolicyStatus, User } from '@db';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
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
  // Dialog state only - no form state
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const router = useRouter();

  // Track selected status
  const [selectedStatus, setSelectedStatus] = useState<PolicyStatus>(policy.status);

  // Track selected assignee
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(policy.assigneeId);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track form interactions to determine button text
  const [formInteracted, setFormInteracted] = useState(false);

  const fieldsDisabled = isPendingApproval;

  const updatePolicyForm = useAction(updatePolicyFormAction, {
    onSuccess: () => {
      toast.success('Policy updated successfully');
      setIsSubmitting(false);
      setFormInteracted(false); // Reset form interaction state after successful update
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
      setFormInteracted(false); // Reset form interaction state after successful submission
      setSelectedStatus('needs_review');
      router.refresh();
    },
    onError: () => {
      toast.error('Failed to submit policy for approval.');
      setIsSubmitting(false);
    },
  });

  // Function to handle form field changes
  const handleFormChange = () => {
    setFormInteracted(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Get form data directly from the form element
    const formData = new FormData(e.currentTarget);
    const status = formData.get('status') as PolicyStatus;
    const assigneeId = selectedAssigneeId; // Use state instead of form data
    const department = formData.get('department') as Departments;
    const reviewFrequency = formData.get('review_frequency') as Frequency;

    // Get review date from the form or use the existing one
    const reviewDate = policy.reviewDate ? new Date(policy.reviewDate) : new Date();

    // Check if the policy is published and if there are changes
    const isPublishedWithChanges =
      policy.status === 'published' &&
      (status !== policy.status ||
        assigneeId !== policy.assigneeId ||
        department !== policy.department ||
        reviewFrequency !== policy.frequency ||
        (policy.reviewDate ? new Date(policy.reviewDate).toDateString() : '') !==
          reviewDate.toDateString());

    // If policy is draft and being published OR policy is published and has changes
    if ((['draft', 'needs_review'].includes(policy.status) && status === 'published') || isPublishedWithChanges) {
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

    // Get form data directly from the DOM
    const form = document.getElementById('policy-form') as HTMLFormElement;
    const formData = new FormData(form);
    const assigneeId = selectedAssigneeId; // Use state instead of form data
    const department = formData.get('department') as Departments;
    const reviewFrequency = formData.get('review_frequency') as Frequency;

    // Get review date from the form or use the existing one
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

  // Check if form has been modified to determine button state
  const hasFormChanges = formInteracted;

  // Determine button text based on status and form interaction
  let buttonText = 'Save';
  if (
    (['draft', 'needs_review'].includes(policy.status) && selectedStatus === 'published') ||
    (policy.status === 'published' && hasFormChanges)
  ) {
    buttonText = 'Submit for Approval';
  }

  return (
    <>
      <form id="policy-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Status Field */}
          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            {/* Hidden input for form submission */}
            <input type="hidden" name="status" id="status" value={selectedStatus} />
            <Select
              value={selectedStatus}
              disabled={fieldsDisabled}
              onValueChange={(value) => {
                setSelectedStatus(value as PolicyStatus);
                handleFormChange();
              }}
            >
              <SelectTrigger value={selectedStatus}>
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
          </div>

          {/* Review Frequency Field */}
          <div className="space-y-2">
            <label htmlFor="review_frequency" className="text-sm font-medium">
              Review Frequency
            </label>
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
          </div>

          {/* Department Field */}
          <div className="space-y-2">
            <label htmlFor="department" className="text-sm font-medium">
              Department
            </label>
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
                {Object.values(Departments).map((dept) => {
                  const formattedDepartment = dept.toUpperCase();
                  return (
                    <SelectItem key={dept} value={dept}>
                      {formattedDepartment}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee Field */}
          <div className="space-y-2">
            <label htmlFor="assigneeId" className="text-sm font-medium">
              Assignee
            </label>
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
          </div>

          {/* Review Date Field */}
          <div className="mt-2 space-y-2">
            <label htmlFor="review_date" className="text-sm font-medium">
              Review Date
            </label>
            <div className="pt-1.5">
              <Button
                type="button"
                variant="outline"
                disabled
                className={cn(
                  'w-full pl-3 text-left font-normal pointer-events-none cursor-not-allowed select-none'
                )}
              >
                {policy.reviewDate ? (
                  format(new Date(policy.reviewDate), 'PPP')
                ) : (
                  <span>None</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </div>
            {/* Hidden input to store the date value */}
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
          </div>
        </div>

        <div className="col-span-1 flex justify-end gap-2 md:col-span-2">
          {!isPendingApproval && (
            <Button
              type="submit"
              disabled={
                !hasFormChanges ||
                isSubmitting ||
                updatePolicyForm.isExecuting ||
                submitForApproval.isExecuting
              }
            >
              {(isSubmitting || updatePolicyForm.isExecuting || submitForApproval.isExecuting) && (
                <Loader2 className="mr-2 animate-spin" />
              )}
              {buttonText}
            </Button>
          )}
        </div>
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
