'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  Grid,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
} from '@trycompai/design-system';
import { WarningAlt } from '@trycompai/design-system/icons';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { IsmsRole } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { AUDIT_ROUTE_OPTIONS } from './roles-constants';
import { IsmsFieldLabel } from './shared';

/** The audit-route payload sent to the role update endpoint. */
export interface AuditRouteUpdate {
  auditRoute: string | null;
  auditRouteMemberId: string | null;
  auditFirmName: string | null;
  auditEvidenceRef: string | null;
  auditCourse: string | null;
  auditDueDate: string | null;
}

interface AuditRouteFormValues {
  auditRoute: string;
  auditRouteMemberId: string;
  auditFirmName: string;
  auditEvidenceRef: string;
  auditCourse: string;
  auditDueDate: string;
}

interface AuditRoutePickerProps {
  role: IsmsRole;
  canEdit: boolean;
  memberOptions: ApproverOption[];
  /** Member ids assigned to the SPO role, for the conflict-of-interest warning. */
  spoMemberIds: string[];
  onSave: (update: AuditRouteUpdate) => Promise<void>;
}

function toFormValues(role: IsmsRole): AuditRouteFormValues {
  return {
    auditRoute: role.auditRoute ?? '',
    auditRouteMemberId: role.auditRouteMemberId ?? '',
    auditFirmName: role.auditFirmName ?? '',
    auditEvidenceRef: role.auditEvidenceRef ?? '',
    auditCourse: role.auditCourse ?? '',
    auditDueDate: role.auditDueDate?.slice(0, 10) ?? '',
  };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function AuditRoutePicker({
  role,
  canEdit,
  memberOptions,
  spoMemberIds,
  onSave,
}: AuditRoutePickerProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<AuditRouteFormValues>({ defaultValues: toFormValues(role) });

  useEffect(() => {
    reset(toFormValues(role));
  }, [role, reset]);

  const route = useWatch({ control, name: 'auditRoute' });
  const selectedMemberId = useWatch({ control, name: 'auditRouteMemberId' });

  const conflictMember =
    route === 'in_house' && selectedMemberId && spoMemberIds.includes(selectedMemberId)
      ? (memberOptions.find((option) => option.id === selectedMemberId)?.name ??
        'This member')
      : null;

  const handleSave = handleSubmit(async (values) => {
    const inHouseOrTraining =
      values.auditRoute === 'in_house' || values.auditRoute === 'training_planned';
    try {
      await onSave({
        auditRoute: values.auditRoute || null,
        auditRouteMemberId: inHouseOrTraining
          ? emptyToNull(values.auditRouteMemberId)
          : null,
        auditFirmName:
          values.auditRoute === 'external' ? emptyToNull(values.auditFirmName) : null,
        auditEvidenceRef:
          values.auditRoute === 'external'
            ? emptyToNull(values.auditEvidenceRef)
            : null,
        auditCourse:
          values.auditRoute === 'training_planned'
            ? emptyToNull(values.auditCourse)
            : null,
        auditDueDate:
          values.auditRoute === 'training_planned'
            ? emptyToNull(values.auditDueDate)
            : null,
      });
    } catch {
      // The caller surfaces the failure via toast and re-throws; swallow here so a
      // failed save keeps the form dirty for retry without an unhandled rejection.
    }
  });

  const hasMemberOptions = memberOptions.length > 0;

  return (
    <Stack gap="3">
      <IsmsFieldLabel label="Internal audit route">
        <Controller
          control={control}
          name="auditRoute"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              disabled={!canEdit}
            >
              <SelectTrigger aria-label="Internal audit route">
                <SelectValue placeholder="Select an audit route" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_ROUTE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </IsmsFieldLabel>

      {route === 'in_house' ? (
        <IsmsFieldLabel label="In-house auditor">
          <Controller
            control={control}
            name="auditRouteMemberId"
            render={({ field }) => (
              // A member id is required (it must resolve to a real person), so we
              // never offer editable free text — the select disables when there
              // are no members to pick.
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={!canEdit || !hasMemberOptions}
              >
                <SelectTrigger aria-label="In-house auditor">
                  <SelectValue
                    placeholder={
                      hasMemberOptions ? 'Select a member' : 'No members available'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {memberOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </IsmsFieldLabel>
      ) : null}

      {route === 'external' ? (
        <Grid cols={{ base: '1', md: '2' }} gap="3">
          <IsmsFieldLabel label="Firm / person">
            <Field>
              <Controller
                control={control}
                name="auditFirmName"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Input
                    {...field}
                    disabled={!canEdit}
                    placeholder="External auditor name"
                    aria-label="External auditor firm or person"
                  />
                )}
              />
            </Field>
          </IsmsFieldLabel>
          <IsmsFieldLabel label="Evidence reference">
            <Field>
              <Controller
                control={control}
                name="auditEvidenceRef"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Input
                    {...field}
                    disabled={!canEdit}
                    placeholder="e.g. Lead Auditor certificate"
                    aria-label="External auditor evidence reference"
                  />
                )}
              />
            </Field>
          </IsmsFieldLabel>
        </Grid>
      ) : null}

      {route === 'training_planned' ? (
        <Grid cols={{ base: '1', md: '3' }} gap="3">
          <IsmsFieldLabel label="Member">
            <Controller
              control={control}
              name="auditRouteMemberId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!canEdit || !hasMemberOptions}
                >
                  <SelectTrigger aria-label="Member in training">
                    <SelectValue
                      placeholder={
                        hasMemberOptions ? 'Select a member' : 'No members available'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </IsmsFieldLabel>
          <IsmsFieldLabel label="Course">
            <Field>
              <Controller
                control={control}
                name="auditCourse"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Input
                    {...field}
                    disabled={!canEdit}
                    placeholder="Course name"
                    aria-label="Training course"
                  />
                )}
              />
            </Field>
          </IsmsFieldLabel>
          <IsmsFieldLabel label="Due date">
            <Field>
              <Controller
                control={control}
                name="auditDueDate"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Input {...field} type="date" disabled={!canEdit} aria-label="Training due date" />
                )}
              />
            </Field>
          </IsmsFieldLabel>
        </Grid>
      ) : null}

      {conflictMember ? (
        <Alert variant="warning" icon={<WarningAlt />}>
          <AlertTitle>Independence conflict</AlertTitle>
          <AlertDescription>
            {conflictMember} is also assigned as the Security &amp; Privacy Owner. ISO 27001
            requires the internal auditor to be objective and impartial — a person auditing an
            ISMS they also run creates a conflict. For teams of your size, outsourcing the
            internal audit to an external auditor is the standard route and usually the most
            cost-effective way to satisfy the independence requirement. If you keep this as-is, be
            prepared to justify the arrangement at Stage 2.
          </AlertDescription>
        </Alert>
      ) : null}

      {canEdit ? (
        <HStack justify="end">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSave}
            disabled={!isDirty || isSubmitting}
            loading={isSubmitting}
          >
            Save audit route
          </Button>
        </HStack>
      ) : null}
    </Stack>
  );
}
