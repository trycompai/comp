"use client";

import { calculateNextReview } from "@/lib/utils/calculate-next-review";
import type { Frequency, OrganizationEvidence } from "@bubba/db";
import { Button } from "@bubba/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { format } from "date-fns";
import { Building, CalendarClock, RefreshCw, User } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { publishEvidence } from "../actions/publishEvidence";
import { toggleRelevance } from "../actions/toggleRelevance";
import { useOrganizationEvidence } from "../hooks/useOrganizationEvidence";
import { AssigneeSection } from "./AssigneeSection";
import { DepartmentSection } from "./DepartmentSection";
import { FrequencySection } from "./FrequencySection";

interface ReviewSectionProps {
  evidence: OrganizationEvidence;
  evidenceId: string;
  lastPublishedAt: Date | null;
  frequency: Frequency | null;
  department: string | null;
  currentAssigneeId: string | null | undefined;
  onSuccess: () => Promise<void>;
  id: string;
}

export function ReviewSection({
  evidenceId,
  lastPublishedAt,
  frequency,
  department,
  currentAssigneeId,
  onSuccess,
  id,
  evidence,
}: ReviewSectionProps) {
  const { mutate } = useOrganizationEvidence({ id });
  const reviewInfo = calculateNextReview(lastPublishedAt, frequency);

  const { execute: toggleRelevanceAction, isExecuting: isTogglingRelevance } =
    useAction(toggleRelevance, {
      onSuccess: () => {
        toast.success("Evidence relevance updated successfully");
        mutate();
      },
      onError: () => {
        toast.error("Failed to update evidence relevance, please try again.");
      },
    });

  const { execute: publishAction, isExecuting } = useAction(publishEvidence, {
    onSuccess: () => {
      toast.success("Evidence published successfully");
      mutate();
    },
    onError: () => {
      toast.error("Failed to publish evidence, please try again.");
    },
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Evidence Overview</h2>
            <h3 className="text-sm text-muted-foreground">
              Manage review frequency, department assignment, and track upcoming
              review dates
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toggleRelevanceAction({
                id,
                isNotRelevant: !evidence.isNotRelevant,
              })
            }
            disabled={isTogglingRelevance}
            className="text-xs"
          >
            {evidence.isNotRelevant
              ? "Mark as relevant"
              : "Mark as not relevant"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-2">
        <div className="grid grid-cols-2 gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Building className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-medium text-muted-foreground">
                DEPARTMENT
              </h3>
            </div>
            <DepartmentSection
              evidenceId={evidenceId}
              currentDepartment={department}
              onSuccess={onSuccess}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-medium text-muted-foreground">
                FREQUENCY
              </h3>
            </div>
            <FrequencySection
              evidenceId={evidenceId}
              currentFrequency={frequency}
              onSuccess={onSuccess}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-medium text-muted-foreground">
                NEXT REVIEW
              </h3>
            </div>
            {!reviewInfo ? (
              <p className="text-red-500 font-medium text-sm">ASAP</p>
            ) : (
              <div
                className={`text-sm font-medium ${reviewInfo.isUrgent ? "text-red-500" : ""}`}
              >
                {reviewInfo.daysUntil} days (
                {format(reviewInfo.nextReviewDate, "MM/dd/yyyy")})
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-medium text-muted-foreground">
                ASSIGNEE
              </h3>
            </div>
            <AssigneeSection
              evidenceId={evidenceId}
              currentAssigneeId={currentAssigneeId}
              onSuccess={onSuccess}
            />
          </div>
        </div>
        {!evidence.published && (
          <Button
            size="sm"
            className="w-fit self-end"
            onClick={() => publishAction({ id })}
            disabled={isExecuting}
          >
            {isExecuting ? "Publishing..." : "Publish"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
