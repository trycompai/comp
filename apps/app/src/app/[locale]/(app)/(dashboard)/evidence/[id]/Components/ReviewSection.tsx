"use client";

import type { Frequency } from "@bubba/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@bubba/ui/card";
import { CalendarClock, Pencil, RefreshCw, Building } from "lucide-react";
import { calculateNextReview } from "@/lib/utils/calculate-next-review";
import { format } from "date-fns";
import { FrequencySection } from "./FrequencySection";
import { DepartmentSection } from "./DepartmentSection";
import { AssigneeSection } from "./AssigneeSection";

interface ReviewSectionProps {
  evidenceId: string;
  lastPublishedAt: Date | null;
  frequency: Frequency | null;
  department: string | null;
  currentAssigneeId: string | null | undefined;
  onSuccess: () => Promise<void>;
}

export function ReviewSection({
  evidenceId,
  lastPublishedAt,
  frequency,
  department,
  currentAssigneeId,
  onSuccess,
}: ReviewSectionProps) {
  const reviewInfo = calculateNextReview(lastPublishedAt, frequency);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            Evidence Details
          </CardTitle>
          <CardDescription className="text-xs">
            Manage review frequency, department assignment, and track upcoming
            review dates
          </CardDescription>
        </div>
        <AssigneeSection
          evidenceId={evidenceId}
          currentAssigneeId={currentAssigneeId}
          onSuccess={onSuccess}
        />
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="flex-1 max-w-[150px]">
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

          <div className="flex-1 max-w-[150px]">
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

          <div className="flex-1 min-w-[180px]">
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
        </div>
      </CardContent>
    </Card>
  );
}
