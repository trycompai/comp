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
  return <PolicyContainer policies={policies} member={member} />;
}
