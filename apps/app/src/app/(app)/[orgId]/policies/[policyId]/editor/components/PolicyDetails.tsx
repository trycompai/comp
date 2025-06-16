"use client";

import { PolicyEditor } from "@/components/editor/policy-editor";
import type { JSONContent } from "@tiptap/react";
import "@comp/ui/editor.css";
import { updatePolicy } from "../actions/update-policy";
interface PolicyDetailsProps {
  policyId: string;
  policyContent: JSONContent | JSONContent[];
  isPendingApproval: boolean;
}

export function PolicyPageEditor({
  policyId,
  policyContent,
  isPendingApproval,
}: PolicyDetailsProps) {
  const formattedContent = Array.isArray(policyContent)
    ? policyContent
    : typeof policyContent === "object" && policyContent !== null
      ? [policyContent as JSONContent]
      : [];

  const handleSavePolicy = async (
    policyContent: JSONContent[],
  ): Promise<void> => {
    if (!policyId) return;

    try {
      await updatePolicy({ policyId, content: policyContent });
    } catch (error) {
      console.error("Error saving policy:", error);
      throw error;
    }
  };

  return (
    <div className="flex h-full flex-col border">
      <PolicyEditor
        content={formattedContent}
        onSave={handleSavePolicy}
        readOnly={isPendingApproval}
      />
    </div>
  );
}
