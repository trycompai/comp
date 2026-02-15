'use client';

import { acceptAllPolicies } from '@/actions/accept-policies';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { cn } from '@comp/ui/cn';
import type { Member, Policy, PolicyVersion } from '@db';
import { Button } from '@trycompai/design-system';
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

      const result = await acceptAllPolicies(unacceptedPolicyIds, member.id);

      if (result.success) {
        setAcceptedPolicies([...acceptedPolicies, ...unacceptedPolicyIds]);
        toast.success('All policies accepted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to accept policies');
      }
    } catch (error) {
      console.error('Error accepting all policies:', error);
      toast.error('An error occurred while accepting policies');
    } finally {
      setIsAcceptingAll(false);
    }
  };

  return (
    <AccordionItem value="policies" className="border rounded-xs">
      <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]]:pb-2">
        <div className="flex items-center gap-3">
          {hasAcceptedPolicies ? (
            <CheckmarkFilled size={20} className="text-primary" />
          ) : (
            <CircleDash size={20} className="text-muted-foreground" />
          )}
          <span
            className={cn('text-base', hasAcceptedPolicies && 'text-muted-foreground line-through')}
          >
            Accept security policies
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          {policies.length > 0 ? (
            <>
              <p className="text-muted-foreground text-sm">
                Please review and accept the following security policies:
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
                        <Document size={16} className="text-muted-foreground" />
                        <span className={cn(isAccepted && 'line-through')}>{policy.name}</span>
                      </Link>
                      {isAccepted && <CheckmarkFilled size={12} className="text-primary" />}
                    </div>
                  );
                })}
              </div>
              <Button
                size="sm"
                onClick={handleAcceptAllPolicies}
                disabled={hasAcceptedPolicies || isAcceptingAll}
                loading={isAcceptingAll}
              >
                {hasAcceptedPolicies ? 'All Policies Accepted' : 'Accept All'}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No policies ready to be signed.</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
