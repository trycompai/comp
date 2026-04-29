'use client';

import type { Member, Policy, User } from '@db';
import { Stack, Text } from '@trycompai/design-system';
import { CheckmarkFilled, WarningAltFilled } from '@trycompai/design-system/icons';

interface EmployeePoliciesProps {
  employee: Member & { user: User };
  policies: Policy[];
}

export function EmployeePolicies({ employee, policies }: EmployeePoliciesProps) {
  return (
    <Stack gap="sm">
      {policies.length === 0 ? (
        <div className="py-6 text-center">
          <Text variant="muted">No policies required to sign.</Text>
        </div>
      ) : (
        policies.map((policy) => {
          const isCompleted = policy.signedBy.includes(employee.id);

          return (
            <div
              key={policy.id}
              className="flex items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <span className={isCompleted ? 'text-primary' : 'text-destructive'}>
                  {isCompleted ? <CheckmarkFilled size={16} /> : <WarningAltFilled size={16} />}
                </span>
                <Text>{policy.name}</Text>
              </div>
            </div>
          );
        })
      )}
    </Stack>
  );
}
