'use client';

import { Card, HStack, Link, Text, VStack } from '@trycompai/ui-v2';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';

import type { EmployeePortalDashboard } from '../../../types/employee-portal';

interface DeviceAgentPolicyStatusCardProps {
  host: NonNullable<EmployeePortalDashboard['host']>;
  fleetPolicies: EmployeePortalDashboard['fleetPolicies'];
  isMacOS: boolean;
  mdmEnabledStatus: { name: string; response: 'pass' | 'fail' };
}

export function DeviceAgentPolicyStatusCard({
  host,
  fleetPolicies,
  isMacOS,
  mdmEnabledStatus,
}: DeviceAgentPolicyStatusCardProps) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>{host.computer_name}</Card.Title>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap="3">
          {fleetPolicies.length > 0 ? (
            <>
              {fleetPolicies.map((policy) => {
                const isPass = policy.response === 'pass';
                return (
                  <HStack
                    key={policy.id}
                    justify="space-between"
                    borderWidth="1px"
                    borderColor="border"
                    borderLeftWidth="4px"
                    borderLeftColor={isPass ? 'green.500' : 'red.500'}
                    borderRadius="md"
                    padding="3"
                  >
                    <Text fontSize="sm" fontWeight="medium">
                      {policy.name}
                    </Text>
                    <HStack gap="1" color={isPass ? 'green.600' : 'red.600'}>
                      {isPass ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      <Text fontSize="sm">{isPass ? 'Pass' : 'Fail'}</Text>
                    </HStack>
                  </HStack>
                );
              })}

              {isMacOS && (
                <HStack
                  justify="space-between"
                  borderWidth="1px"
                  borderColor="border"
                  borderLeftWidth="4px"
                  borderLeftColor={mdmEnabledStatus.response === 'pass' ? 'green.500' : 'red.500'}
                  borderRadius="md"
                  padding="3"
                >
                  <HStack gap="2">
                    <Text fontSize="sm" fontWeight="medium">
                      {mdmEnabledStatus.name}
                    </Text>
                    {mdmEnabledStatus.response === 'fail' && (
                      <Link
                        href="https://trycomp.ai/docs/device-agent#mdm-user-guide"
                        target="_blank"
                        rel="noopener noreferrer"
                        color="fg.muted"
                        _hover={{ color: 'fg' }}
                        aria-label="Open MDM instructions"
                      >
                        <HelpCircle size={14} />
                      </Link>
                    )}
                  </HStack>
                  {mdmEnabledStatus.response === 'pass' ? (
                    <HStack gap="1" color="green.600">
                      <CheckCircle2 size={16} />
                      <Text fontSize="sm">Pass</Text>
                    </HStack>
                  ) : (
                    <HStack gap="1" color="red.600">
                      <XCircle size={16} />
                      <Text fontSize="sm">Fail</Text>
                    </HStack>
                  )}
                </HStack>
              )}
            </>
          ) : (
            <Text fontSize="sm" color="fg.muted">
              No policies configured for this device.
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
