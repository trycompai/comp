"use client";

import { useI18n } from "@/locales/client";
import { Card, CardContent, CardHeader } from "@bubba/ui/card";
import { Skeleton } from "@bubba/ui/skeleton";
import { redirect } from "next/navigation";
import { useState } from "react";
import { PolicyEditor } from "@/components/editor/policy-editor";
import { usePolicyDetails } from "../../../(overview)/hooks/usePolicy";
import type { JSONContent } from "@tiptap/react";

interface PolicyDetailsProps {
  policyId: string;
}

export function PolicyDetails({ policyId }: PolicyDetailsProps) {
  const t = useI18n();
  const { policy, isLoading, error, updatePolicy } = usePolicyDetails(policyId);
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving" | "Unsaved">(
    "Saved",
  );
  const [wordCount, setWordCount] = useState<number>(0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!policy) return redirect("/policies");

  const formattedContent = Array.isArray(policy.content)
    ? policy.content
    : typeof policy.content === "object" && policy.content !== null
      ? [policy.content as JSONContent]
      : [];

  const handleSavePolicy = async (content: JSONContent[]): Promise<void> => {
    if (!policy) return;

    try {
      setSaveStatus("Saving");
      await updatePolicy({
        ...policy,
        content,
      });
      setSaveStatus("Saved");
    } catch (error) {
      console.error("Error saving policy:", error);
      setSaveStatus("Unsaved");
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-full mx-auto">
      <PolicyEditor
        policyId={policyId}
        content={formattedContent}
        onSave={handleSavePolicy}
      />
    </div>
  );
}
