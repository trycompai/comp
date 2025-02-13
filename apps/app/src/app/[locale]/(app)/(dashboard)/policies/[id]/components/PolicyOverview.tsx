"use client";

import type { JSONContent } from "@tiptap/react";
import PolicyEditor from "@/components/editor/advanced-editor";
import { usePolicy } from "@/app/[locale]/(app)/(dashboard)/policies/hooks/usePolicy";
import { Button } from "@bubba/ui/button";
import { Separator } from "@bubba/ui/separator";

export function PolicyOverview({ policyId }: { policyId: string }) {
  const { data: policy } = usePolicy({ policyId });

  if (!policy) return null;

  const content = policy.content as JSONContent;

  if (!content) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col py-4 gap-4">
      <div className="flex justify-end">
        <Button variant="secondary" className="w-fit">
          Publish
        </Button>
      </div>
      <Separator className="opacity-50" />
      <PolicyEditor policyId={policyId} content={content} />
    </div>
  );
}
