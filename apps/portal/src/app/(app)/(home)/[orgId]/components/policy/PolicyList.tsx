'use client';

import type { PortalPolicy } from '@/lib/portal-policy-types';
import type { Member } from '@db';
import { PolicyContainer } from './PolicyContainer';

interface PolicyListProps {
  policies: PortalPolicy[];
  member: Member;
}

export function PolicyList({ policies, member }: PolicyListProps) {
  return <PolicyContainer policies={policies} member={member} />;
}
