import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import type { ReviewAttendee } from '../documents/management-review';

type Client = Prisma.TransactionClient | typeof db;

function memberDisplayName(
  user: { name: string | null; email: string | null } | null,
): string {
  return user?.name?.trim() || user?.email?.trim() || 'Unknown member';
}

/**
 * Resolve the ticket's participant defaults for a new review from the ISMS >
 * Roles (5.3) document: chair = the first active Top Management holder,
 * attendees = Chair + the first active SPO holder, deduped by member (for a
 * 1-3 person org they may be the same person — one attendee is the honest
 * default). Names are resolved server-side and frozen at creation; everything
 * degrades to empty when Roles has no holders yet (same as the monitoring
 * SPO-fallback precedent, which also tolerates an unassigned Roles document).
 */
export async function resolveReviewParticipantDefaults({
  tx,
  organizationId,
}: {
  tx: Client;
  organizationId: string;
}): Promise<{ chairName: string | null; attendees: ReviewAttendee[] }> {
  const [members, roles] = await Promise.all([
    tx.member.findMany({
      where: { organizationId, deactivated: false },
      select: { id: true, user: { select: { name: true, email: true } } },
    }),
    tx.ismsRole.findMany({
      where: {
        roleKey: { in: ['top_management', 'spo'] },
        document: { organizationId, type: 'roles_and_responsibilities' },
      },
      select: {
        roleKey: true,
        assignments: {
          orderBy: { position: 'asc' },
          select: { memberId: true },
        },
      },
    }),
  ]);

  const memberNames = new Map(
    members.map((member) => [member.id, memberDisplayName(member.user)]),
  );
  const firstActiveHolder = (roleKey: string): ReviewAttendee | null => {
    const role = roles.find((row) => row.roleKey === roleKey);
    for (const assignment of role?.assignments ?? []) {
      const name = memberNames.get(assignment.memberId);
      if (name) return { memberId: assignment.memberId, name };
    }
    return null;
  };

  const chair = firstActiveHolder('top_management');
  const spo = firstActiveHolder('spo');

  const attendees: ReviewAttendee[] = [];
  for (const attendee of [chair, spo]) {
    if (!attendee) continue;
    if (attendees.some((row) => row.memberId === attendee.memberId)) continue;
    attendees.push(attendee);
  }

  return { chairName: chair?.name ?? null, attendees };
}

/**
 * Attendees are selected from People, so every memberId must belong to this
 * organization. Deactivated members stay valid — the minutes are a historical
 * record, and editing a review after someone leaves must not force removing
 * them from it. Display names are client-frozen at selection (the CS-724
 * auditorName precedent: never re-validated against the live roster).
 */
export async function validateReviewAttendees({
  attendees,
  organizationId,
}: {
  attendees: ReviewAttendee[];
  organizationId: string;
}): Promise<void> {
  if (attendees.length === 0) return;
  const memberIds = [...new Set(attendees.map((row) => row.memberId))];
  const found = await db.member.count({
    where: { id: { in: memberIds }, organizationId },
  });
  if (found !== memberIds.length) {
    throw new NotFoundException(
      'One or more attendees are not members of this organization',
    );
  }
}
