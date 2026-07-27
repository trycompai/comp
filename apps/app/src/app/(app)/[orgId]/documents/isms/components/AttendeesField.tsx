'use client';

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Close } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type {
  IsmsManagementReview,
  IsmsReviewAttendee,
} from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { parseAttendees } from './management-review-constants';
import { IsmsFieldLabel } from './shared';

interface AttendeesFieldProps {
  review: IsmsManagementReview;
  canEdit: boolean;
  memberOptions: ApproverOption[];
  /** Saves the full replacement list (the register PATCH replaces attendees). */
  onSave: (attendees: IsmsReviewAttendee[]) => Promise<void>;
}

/**
 * The review's attendees: a multi-select from People (Select-to-add plus a
 * removable list, the RoleAssignments pattern). Defaults to Chair + SPO at
 * creation — for a 1-3 person org that may be a single person, which is fine.
 * Names are frozen at selection: a former member stays on the historical
 * minutes even after leaving People.
 */
export function AttendeesField({
  review,
  canEdit,
  memberOptions,
  onSave,
}: AttendeesFieldProps) {
  // Controlled picker value so it reliably returns to its placeholder after
  // each selection (the RoleAssignments pattern).
  const [pendingMember, setPendingMember] = useState('');
  // Each save PATCHes the WHOLE list, so overlapping saves built from a stale
  // render would drop each other's change — serialize by disabling the
  // affordances while one is in flight.
  const [isSaving, setIsSaving] = useState(false);

  const attendees = parseAttendees(review.attendees);
  const attendingIds = new Set(attendees.map((attendee) => attendee.memberId));
  const availableMembers = memberOptions.filter(
    (option) => !attendingIds.has(option.id),
  );

  const save = async (next: IsmsReviewAttendee[]) => {
    setIsSaving(true);
    try {
      await onSave(next);
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = (memberId: string | null | undefined) => {
    if (!memberId || isSaving) return;
    const member = memberOptions.find((option) => option.id === memberId);
    if (!member) return;
    // Reset the picker back to its placeholder after selecting.
    setPendingMember('');
    void save([...attendees, { memberId: member.id, name: member.name }]);
  };

  const handleRemove = (memberId: string) => {
    if (isSaving) return;
    void save(attendees.filter((attendee) => attendee.memberId !== memberId));
  };

  return (
    <IsmsFieldLabel label="Attendees">
      <Stack gap="2">
        {attendees.length === 0 ? (
          <Text size="sm" variant="muted">
            No attendees yet — defaults to the Chair and the Security &amp; Privacy Owner from
            ISMS &gt; Roles.
          </Text>
        ) : (
          <div className="flex flex-wrap gap-2">
            {attendees.map((attendee) => (
              <div
                key={attendee.memberId}
                className="flex items-center gap-1 rounded-md border border-border bg-muted/30 py-1 pl-3 pr-1"
              >
                <Text size="sm">{attendee.name}</Text>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(attendee.memberId)}
                    disabled={isSaving}
                    iconLeft={<Close size={16} />}
                    aria-label={`Remove attendee ${attendee.name}`}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {canEdit && availableMembers.length > 0 ? (
          <div className="w-full md:max-w-sm">
            <Select
              value={pendingMember || undefined}
              onValueChange={handleAdd}
              disabled={isSaving}
            >
              <SelectTrigger aria-label="Add an attendee">
                <SelectValue placeholder="Add an attendee…" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </Stack>
    </IsmsFieldLabel>
  );
}
