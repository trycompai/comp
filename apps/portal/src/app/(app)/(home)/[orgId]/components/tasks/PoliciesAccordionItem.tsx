'use client';

import { apiClient } from '@/lib/api-client';
import { AccordionContent, AccordionItem, AccordionTrigger, Button } from '@trycompai/design-system';
import { CheckCircle2, Circle, FileText } from 'lucide-react';
import NextLink from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import type { EmployeePortalDashboard } from '../../types/employee-portal';

interface PoliciesAccordionItemProps {
  policies: EmployeePortalDashboard['policies'];
  member: EmployeePortalDashboard['member'];
}

export function PoliciesAccordionItem({ policies, member }: PoliciesAccordionItemProps) {
  const { mutate } = useSWRConfig();
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

      const result = await apiClient.post<{ success: boolean; error?: string }>(
        '/v1/policies/acknowledge-bulk',
        { policyIds: unacceptedPolicyIds },
        member.organizationId,
      );

      if (!result.error) {
        setAcceptedPolicies([...acceptedPolicies, ...unacceptedPolicyIds]);
        toast.success('All policies accepted successfully');
        await mutate(['employee-portal-overview', member.organizationId]);
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
    <AccordionItem value="policies">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex flex-1 items-center gap-3 text-left">
          {hasAcceptedPolicies ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
          <span
            className={
              hasAcceptedPolicies
                ? 'text-sm font-medium text-muted-foreground line-through'
                : 'text-sm font-medium text-foreground'
            }
          >
            Accept security policies
          </span>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pt-1">
        {policies.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Please review and accept the following security policies:
            </p>

            <div className="flex flex-col gap-2">
              {policies.map((policy) => {
                const isAccepted = acceptedPolicies.includes(policy.id);

                return (
                  <div key={policy.id} className="flex items-center justify-between gap-3">
                    <NextLink
                      href={`/${member.organizationId}/policy/${policy.id}`}
                      className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary"
                    >
                      <FileText className="h-4 w-4" />
                      <span
                        className={isAccepted ? 'text-muted-foreground line-through' : undefined}
                      >
                        {policy.name}
                      </span>
                    </NextLink>

                    {isAccepted ? <CheckCircle2 className="h-4 w-4" /> : null}
                  </div>
                );
              })}
            </div>

            <Button
              size="sm"
              onClick={handleAcceptAllPolicies}
              disabled={hasAcceptedPolicies || isAcceptingAll}
            >
              {hasAcceptedPolicies
                ? 'All Policies Accepted'
                : isAcceptingAll
                  ? 'Accepting…'
                  : 'Accept All'}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No policies to accept.</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
