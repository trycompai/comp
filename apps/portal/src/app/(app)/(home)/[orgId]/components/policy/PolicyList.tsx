'use client';

import type { Member, Policy, PolicyVersion } from '@db';
import { PolicyContainer } from './PolicyContainer';

type PolicyWithVersion = Policy & {
  currentVersion?: Pick<PolicyVersion, 'id' | 'content' | 'pdfUrl' | 'version'> | null;
};

interface PolicyListProps {
  policies: PolicyWithVersion[];
  member: Member;
}

export function PolicyList({ policies, member }: PolicyListProps) {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <PolicyContainer policies={policies} member={member} />
    </div>
  );
}
