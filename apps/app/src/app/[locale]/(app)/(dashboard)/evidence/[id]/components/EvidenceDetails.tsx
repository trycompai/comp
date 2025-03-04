"use client";

import { Alert, AlertDescription, AlertTitle } from "@bubba/ui/alert";
import { Skeleton } from "@bubba/ui/skeleton";
import { CheckCircle2, FileIcon, XCircle } from "lucide-react";
import { useOrganizationEvidence } from "../hooks/useOrganizationEvidence";
import type { EvidenceDetailsProps } from "../types";
import { ReviewSection } from "./ReviewSection";

export function EvidenceDetails({ id }: EvidenceDetailsProps) {
  const { data, isLoading, error, mutate } = useOrganizationEvidence({ id });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!data?.data) return null;

  const evidence = data.data;

  const handleMutate = async () => {
    await mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Alert with evidence info and status */}
      <Alert>
        <FileIcon className="h-4 w-4" />
        <AlertTitle>
          <div className="flex items-center justify-between gap-2">
            {evidence.evidence.name} Evidence
            <div className="flex items-center gap-2">
              {evidence.published ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <span className="text-sm text-green-600">Published</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-red-500 shrink-0" />
                  <span className="text-sm text-red-600">Draft</span>
                </div>
              )}
            </div>
          </div>
        </AlertTitle>
        <AlertDescription className="mt-4">
          {evidence.description || "No description provided."}

          {evidence.isNotRelevant && (
            <div className="bg-yellow-800 border border-yellow-600 rounded-md p-3 mt-4 text-yellow-300 text-sm">
              This evidence has been marked as not relevant and will not be
              included in compliance reports.
            </div>
          )}
        </AlertDescription>
      </Alert>

      <ReviewSection
        evidence={evidence}
        evidenceId={id}
        lastPublishedAt={evidence.lastPublishedAt}
        frequency={evidence.frequency}
        department={evidence.department || null}
        currentAssigneeId={evidence.assigneeId}
        onSuccess={handleMutate}
        id={id}
      />
    </div>
  );
}
