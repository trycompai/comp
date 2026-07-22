'use client';

import {
  Badge,
  Heading,
  HStack,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { useMemo } from 'react';
import type { IsmsManagementReview, IsmsReviewAction } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import {
  REVIEW_ACTION_STATUS_LABELS,
  fullActionReference,
} from './management-review-constants';

interface CarriedForwardActionsProps {
  entries: Array<{ review: IsmsManagementReview; action: IsmsReviewAction }>;
  memberOptions: ApproverOption[];
}

/**
 * Open actions from previous reviews, carried forward automatically to this
 * review's input (a) — the customer never has to remember to bring them
 * across. Read-only here: each action is edited on its own review, and its
 * live status keeps tracking to closure.
 */
export function CarriedForwardActions({
  entries,
  memberOptions,
}: CarriedForwardActionsProps) {
  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of memberOptions) map[option.id] = option.name;
    return map;
  }, [memberOptions]);

  return (
    <Stack gap="3">
      <HStack align="center" gap="2">
        <Heading level="5">Carried forward from previous reviews</Heading>
        <Badge variant="secondary">{String(entries.length)}</Badge>
      </HStack>
      <Text size="sm" variant="muted">
        Open actions from earlier reviews — discuss them under input (a) and close them on their
        originating review.
      </Text>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ review, action }) => (
              <TableRow key={action.id}>
                <TableCell>
                  <span className="font-medium">
                    {fullActionReference(review.reference, action.reference)}
                  </span>
                </TableCell>
                <TableCell>{action.description}</TableCell>
                <TableCell>
                  {action.ownerMemberId
                    ? (memberNameById[action.ownerMemberId] ?? 'Former member')
                    : '—'}
                </TableCell>
                <TableCell>{action.dueDate?.slice(0, 10) ?? '—'}</TableCell>
                <TableCell>{REVIEW_ACTION_STATUS_LABELS[action.status]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Stack>
  );
}
