"use client";

import type { Member, Policy } from "@comp/db/types";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Check } from "lucide-react";

interface PolicyGridProps {
  policies: Policy[];
  onPolicyClick: (index: number) => void;
  member: Member;
}

export function PolicyGrid({
  policies,
  onPolicyClick,
  member,
}: PolicyGridProps) {
  const allPoliciesCompleted = policies.every((policy) =>
    policy.signedBy.includes(member.id),
  );

  const noPoliciesFound = policies.length === 0;

  return (
    <div className="space-y-6">
      {!noPoliciesFound && allPoliciesCompleted && (
        <div className="w-full flex flex-col items-center justify-center py-8 space-y-2">
          <h2 className="text-2xl font-semibold">All Policies Completed!</h2>
          <p className="text-muted-foreground text-center">
            You're all done, now your manager won't pester you!
          </p>
        </div>
      )}
      {noPoliciesFound && (
        <div className="w-full flex flex-col items-center justify-center py-8 space-y-2">
          <p className="text-muted-foreground text-center">
            You don't have any policies to sign!
          </p>
        </div>
      )}
      {!noPoliciesFound && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map((policy, index) => {
            const isCompleted = policy.signedBy.includes(member.id);
            return (
              <Card
                key={policy.id}
                className="cursor-pointer hover:shadow-lg transition-shadow relative h-[280px] flex flex-col"
                onClick={() => onPolicyClick(index)}
              >
                {isCompleted && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <Check className="h-12 w-12 text-primary" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{policy.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground line-clamp-4">
                    {policy.description}
                  </p>
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-sm text-muted-foreground">
                      Status: {policy.status}
                      {policy.updatedAt && (
                        <span className="ml-2">
                          (Updated:{" "}
                          {new Date(policy.updatedAt).toLocaleDateString()})
                        </span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
