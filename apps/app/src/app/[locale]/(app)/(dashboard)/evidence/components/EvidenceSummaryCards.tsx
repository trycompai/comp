"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { useEvidenceTable } from "../hooks/useEvidenceTableContext";
import { FileX, FileCheck, Clock, CheckCircle } from "lucide-react";
import { useEvidenceTasksStats } from "../hooks/useEvidenceTasksStats";
import { Skeleton } from "@bubba/ui/skeleton";

export function EvidenceSummaryCards() {
  const { stats, isLoading, error } = useEvidenceTasksStats();

  // Handle loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {["empty", "draft", "review", "uptodate"].map((type) => (
          <Skeleton key={`skeleton-${type}`} className="h-[120px] w-full" />
        ))}
      </div>
    );
  }

  // Handle error state
  if (error) {
    console.error("Error loading evidence task stats:", error);
    return (
      <div className="text-red-500 mb-6">
        Error loading statistics. Please try again later.
      </div>
    );
  }

  // Handle no data state
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Empty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{stats.emptyCount}</div>
            <FileX className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Evidence tasks without files or links
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Draft
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{stats.draftCount}</div>
            <FileCheck className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Has content but not published
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Needs Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{stats.needsReviewCount}</div>
            <Clock className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Published but past due for review
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Up to Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {stats.upToDateCount}/{stats.totalCount}
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Published and current
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
