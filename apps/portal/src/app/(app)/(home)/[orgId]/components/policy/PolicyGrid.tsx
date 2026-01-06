'use client';

import type { Member, Policy } from '@db';
import { Card, CardContent, CardHeader } from '@trycompai/design-system';
import { Check } from 'lucide-react';

interface PolicyGridProps {
  policies: Policy[];
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
          <h2 className="text-2xl font-semibold">All Policies Completed!</h2>
          <p className="text-muted-foreground text-center">
            You're all done, now your manager won't pester you!
          </p>
        </div>
      )}
      {noPoliciesFound && (
        <div className="flex w-full flex-col items-center justify-center space-y-2 py-8">
          <p className="text-muted-foreground text-center">You don't have any policies to sign!</p>
        </div>
      )}
      {!noPoliciesFound && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy, index) => {
            const isCompleted = policy.signedBy.includes(member.id);
            return (
              <button
                key={policy.id}
                type="button"
                onClick={() => onPolicyClick(index)}
                className="relative h-[280px] w-full text-left transition-shadow hover:shadow-lg"
              >
                <Card>
                  {isCompleted ? (
                    <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px]">
                      <Check className="text-primary h-12 w-12" />
                    </div>
                  ) : null}

                  <CardHeader>
                    <h3 className="text-lg font-semibold leading-snug">{policy.name}</h3>
                  </CardHeader>

                  <CardContent>
                    <div className="flex h-[180px] flex-col justify-between">
                      <p className="text-muted-foreground line-clamp-4">{policy.description}</p>
                      <p className="text-muted-foreground text-sm">
                        Status: {policy.status}
                        {policy.updatedAt ? (
                          <span className="ml-2">
                            (Updated: {new Date(policy.updatedAt).toLocaleDateString()})
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
