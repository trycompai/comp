"use client";

import { PoliciesByFramework } from "@/components/policies/charts/policies-by-framework";
import { Skeleton } from "@bubba/ui/skeleton";
import { usePolicies } from "../../hooks/usePolicies";

export function PoliciesOverview() {
  const { data, isLoading, error } = usePolicies();

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Failed to load policy data: {error.message}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4 sm:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* <PolicyOverview data={data} /> */}
        <PoliciesByFramework />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* <PoliciesByAssignee organizationId={organizationId} /> */}
      </div>
    </div>
  );
}
