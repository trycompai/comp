"use client";

import { PolicyEditor } from "@/app/components/editor/PolicyEditor"; // Use PolicyEditor from framework-editor
import type { JSONContent } from "@tiptap/react"; // Or from 'novel'
import { updatePolicyContent } from "./actions"; // Local server action
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";

interface PolicyEditorClientProps {
  policyId: string;
  policyName: string; // For display purposes
  initialContent: JSONContent | JSONContent[] | null | undefined; // From DB
}

export function PolicyEditorClient({
  policyId,
  policyName,
  initialContent,
}: PolicyEditorClientProps) {
  const handleSavePolicy = async (
    contentToSave: JSONContent,
  ): Promise<void> => {
    if (!policyId) return;

    // Ensure the content is strictly JSON-serializable before sending to server action
    const serializableContent = JSON.parse(JSON.stringify(contentToSave));

    try {
      // Pass the cleaned-up object to the server action
      const result = await updatePolicyContent({
        policyId,
        content: serializableContent,
      });
      if (result.success) {
        toast.success("Policy content saved!");
      } else {
        toast.error(result.message || "Failed to save policy content.");
      }
    } catch (error) {
      console.error("Error saving policy content:", error);
      toast.error("An unexpected error occurred while saving.");
      // Re-throw if AdvancedEditor needs to handle it for save status
      throw error;
    }
  };

  return (
    <PolicyEditor initialDbContent={initialContent} onSave={handleSavePolicy} />
  );
}
