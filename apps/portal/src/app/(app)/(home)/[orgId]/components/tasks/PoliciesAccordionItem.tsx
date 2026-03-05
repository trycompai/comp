'use client';

import type { Member, Policy, PolicyVersion } from '@db';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  cn,
} from '@trycompai/design-system';
import { CheckmarkFilled, CircleDash, Document } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

type PolicyWithVersion = Policy & {
  currentVersion?: Pick<PolicyVersion, 'id' | 'content' | 'pdfUrl' | 'version'> | null;
};

interface PoliciesAccordionItemProps {
  policies: PolicyWithVersion[];
  member: Member;
}

export function PoliciesAccordionItem({ policies, member }: PoliciesAccordionItemProps) {
  const router = useRouter();
  const [acceptedPolicies, setAcceptedPolicies] = useState<string[]>(
    policies.filter((p) => p.signedBy.includes(member.id)).map((p) => p.id),
  );
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);

  const hasAcceptedPolicies = policies.length === 0 || acceptedPolicies.length === policies.length;

  const handleAcceptAllPolicies = async () => {
    setIsAcceptingAll(true);
    try {
      const unacceptedPolicyIds = policies
        .filter((p) => !acceptedPolicies.includes(p.id))
        .map((p) => p.id);

      const res = await fetch('/api/portal/accept-policies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyIds: unacceptedPolicyIds, memberId: member.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to accept policies');
      }

      setAcceptedPolicies([...acceptedPolicies, ...unacceptedPolicyIds]);
      toast.success('All policies accepted successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred while accepting policies');
    } finally {
      setIsAcceptingAll(false);
    }
  };

  return (
    <div className="border rounded-xs">
      <AccordionItem value="policies">
        <div className="px-4 [&[data-state=open]]:pb-2">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              {hasAcceptedPolicies ? (
                <div className="text-primary"><CheckmarkFilled size={20} /></div>
              ) : (
                <div className="text-muted-foreground"><CircleDash size={20} /></div>
              )}
              <span
                className={cn('text-base', hasAcceptedPolicies && 'text-muted-foreground line-through')}
              >
                Security Policies
              </span>
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="px-4 pb-4 space-y-4">
            {policies.length > 0 ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Please review and accept the following policies:
                </p>
                <div>
                  {policies.map((policy) => {
                    const isAccepted = acceptedPolicies.includes(policy.id);

                    return (
                      <div key={policy.id} className="underline flex gap-2 items-center">
                        <Link
                          href={`/${member.organizationId}/policy/${policy.id}`}
                          className="hover:text-primary flex items-center gap-2 text-sm transition-colors"
                        >
                          <div className="text-muted-foreground"><Document size={16} /></div>
                          <span className={cn(isAccepted && 'line-through')}>{policy.name}</span>
                        </Link>
                        {isAccepted && <div className="text-primary"><CheckmarkFilled size={12} /></div>}
                      </div>
                    );
                  })}
                </div>
                <Button
                  onClick={handleAcceptAllPolicies}
                  disabled={hasAcceptedPolicies || isAcceptingAll}
                >
                  {isAcceptingAll
                    ? 'Accepting...'
                    : hasAcceptedPolicies
                      ? 'All Policies Accepted'
                      : 'Accept All'}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No policies ready to be signed.</p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
