'use client';

import { apiClient } from '@/lib/api-client';
import { Accordion, Button, HStack, Link, Text, VStack } from '@trycompai/ui-v2';
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
    <Accordion.Item value="policies">
      <Accordion.ItemTrigger>
        <HStack gap="3" flex="1" textAlign="start">
          {hasAcceptedPolicies ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
          <Text
            textStyle="md"
            color={hasAcceptedPolicies ? 'fg.muted' : 'fg'}
            textDecoration={hasAcceptedPolicies ? 'line-through' : undefined}
          >
            Accept security policies
          </Text>
        </HStack>
        <Accordion.ItemIndicator />
      </Accordion.ItemTrigger>

      <Accordion.ItemContent>
        <Accordion.ItemBody>
          <VStack align="stretch" gap="4">
            {policies.length > 0 ? (
              <>
                <Text fontSize="sm" color="fg.muted">
                  Please review and accept the following security policies:
                </Text>

                <VStack align="stretch" gap="2">
                  {policies.map((policy) => {
                    const isAccepted = acceptedPolicies.includes(policy.id);

                    return (
                      <HStack key={policy.id} gap="2" align="center">
                        <Link asChild fontSize="sm" color="fg" _hover={{ color: 'primary.solid' }}>
                          <NextLink href={`/${member.organizationId}/policy/${policy.id}`}>
                            <HStack gap="2">
                              <FileText className="h-4 w-4" />
                              <Text
                                as="span"
                                textDecoration={isAccepted ? 'line-through' : undefined}
                                color={isAccepted ? 'fg.muted' : 'fg'}
                              >
                                {policy.name}
                              </Text>
                            </HStack>
                          </NextLink>
                        </Link>

                        {isAccepted && <CheckCircle2 className="h-4 w-4" />}
                      </HStack>
                    );
                  })}
                </VStack>

                <Button
                  size="sm"
                  onClick={handleAcceptAllPolicies}
                  disabled={hasAcceptedPolicies || isAcceptingAll}
                  loading={isAcceptingAll}
                  colorPalette="primary"
                >
                  {hasAcceptedPolicies ? 'All Policies Accepted' : 'Accept All'}
                </Button>
              </>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No policies to accept.
              </Text>
            )}
          </VStack>
        </Accordion.ItemBody>
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}
