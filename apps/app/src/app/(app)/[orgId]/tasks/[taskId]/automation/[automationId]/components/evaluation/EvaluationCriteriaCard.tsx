"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@trycompai/ui/button";
import { Textarea } from "@trycompai/ui/textarea";

import { updateEvaluationCriteria } from "../../actions/task-automation-actions";
import { useTaskAutomation } from "../../hooks/use-task-automation";

interface EvaluationCriteriaCardProps {
  automationId: string;
  initialCriteria?: string;
  isAiGenerated?: boolean;
}

export function EvaluationCriteriaCard({
  automationId,
  initialCriteria,
}: EvaluationCriteriaCardProps) {
  const { automation } = useTaskAutomation();
  const [isEditing, setIsEditing] = useState(false);
  const [criteria, setCriteria] = useState(initialCriteria || "");
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when automation data changes
  useEffect(() => {
    if (automation?.evaluationCriteria) {
      setCriteria(automation.evaluationCriteria);
    }
  }, [automation?.evaluationCriteria]);

  const handleSave = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsSaving(true);
    try {
      const result = await updateEvaluationCriteria(automationId, criteria);
      if (result.success) {
        toast.success("Success criteria updated");
        setIsEditing(false);
        // Emit event to trigger refresh across the app
        window.dispatchEvent(
          new CustomEvent("task-automation:criteria-updated"),
        );
      } else {
        toast.error(result.error || "Failed to update criteria");
      }
    } catch (error) {
      toast.error("Failed to update criteria");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCriteria(initialCriteria || "");
    setIsEditing(false);
  };

  // Format inline code with chips
  const formatCriteriaText = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        const code = part.slice(1, -1);
        return (
          <code
            key={index}
            className="bg-primary/10 text-foreground border-primary/20 mx-0.5 inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[13px]"
          >
            {code}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Parse pass/fail conditions
  const parseConditions = (text: string) => {
    const lowerText = text.toLowerCase();
    const hasPassCondition =
      lowerText.includes("pass") && lowerText.includes("if");
    const hasFailCondition =
      lowerText.includes("fail") && lowerText.includes("if");

    if (hasPassCondition || hasFailCondition) {
      return { formatted: formatCriteriaText(text), hasStructure: true };
    }
    return { formatted: formatCriteriaText(text), hasStructure: false };
  };

  const { formatted, hasStructure } = criteria
    ? parseConditions(criteria)
    : { formatted: null, hasStructure: false };

  return (
    <div className="group relative">
      {/* Main Card with subtle tint */}
      <div className="bg-primary/5 border-primary/10 hover:border-primary/20 hover:bg-primary/[0.07] rounded-xl border p-5 transition-all">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-foreground text-sm font-semibold">
              Success Criteria
            </h3>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
            >
              Edit criteria
            </button>
          )}
        </div>

        {/* Body */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Define when this automation passes or fails, e.g., 'dependabot is enabled'"
              className="bg-background text-sm leading-relaxed"
              rows={4}
              disabled={isSaving}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {criteria ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <p className="text-foreground flex-1 text-sm leading-relaxed">
                    {formatted}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No success criteria defined yet. Click{" "}
                <span className="text-primary font-medium">Edit criteria</span>{" "}
                to add one.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
