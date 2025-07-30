'use client';

import type { Member, Policy } from '@db';
import { PolicyContainer } from './PolicyContainer';

interface PolicyListProps {
  policies: Policy[];
  member: Member;
}

export function PolicyList({ policies, member }: PolicyListProps) {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <PolicyContainer policies={policies} member={member} />
    </div>
  );
}
