'use client';

import type { Member, Policy, PolicyVersion } from '@db';
import { Card, CardContent, CardHeader, CardTitle, Text } from '@trycompai/design-system';

type PolicyWithVersion = Policy & {
  currentVersion?: Pick<PolicyVersion, 'id' | 'content' | 'pdfUrl' | 'version'> | null;
};

interface PolicyGridProps {
  policies: PolicyWithVersion[];
  onPolicyClick: (index: number) => void;
  member: Member;
}

export function PolicyGrid({ policies, onPolicyClick, member }: PolicyGridProps) {
  const allPoliciesCompleted = policies.every((policy) => policy.signedBy.includes(member.id));

  const noPoliciesFound = policies.length === 0;

  return (
    <div className="space-y-6">
      {!noPoliciesFound && allPoliciesCompleted && (
        <div className="flex w-full flex-col items-center justify-center space-y-2 py-8">
          <Text weight="medium">All Policies Completed!</Text>
          <Text variant="muted">You're all done, now your manager won't pester you!</Text>
        </div>
      )}
      {noPoliciesFound && (
        <div className="flex w-full flex-col items-center justify-center space-y-2 py-8">
          <Text variant="muted">You don't have any policies to sign!</Text>
        </div>
      )}
      {!noPoliciesFound && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy, index) => {
            const isCompleted = policy.signedBy.includes(member.id);
            return (
              <div
                key={policy.id}
                className="relative flex min-h-[220px] cursor-pointer flex-col transition-shadow hover:shadow-lg md:min-h-[260px]"
                onClick={() => onPolicyClick(index)}
              >
                <Card>
                {isCompleted && (
                  <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px]">
                    <Text weight="medium">Completed</Text>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{policy.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex min-h-[120px] flex-col justify-between gap-4">
                    <p className="text-muted-foreground line-clamp-4">{policy.description}</p>
                    <div>
                      <Text variant="muted" size="sm">
                        Status: {policy.status}
                        {policy.updatedAt && (
                          <span className="ml-2">
                            (Updated: {new Date(policy.updatedAt).toLocaleDateString()})
                          </span>
                        )}
                      </Text>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
