"use client";

import React, { useEffect, useRef, useState } from "react";
import { HorizontalBarChart, type ChartDataItem } from "./HorizontalBarChart";
import type { EvidenceWithStatus } from "../actions/getEvidenceDashboard";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/locales/client";

interface FrameworkBarChartProps {
  byFramework?: Record<string, EvidenceWithStatus[]>;
}

// Status colors using CSS variables to match policies-by-assignee.tsx
const STATUS_COLORS = {
  upToDate: "bg-primary",
  draft: "bg-[var(--chart-open)]",
  needsReview: "bg-[hsl(var(--destructive))]",
  empty: "bg-[var(--chart-pending)]",
};

// Status priority order for display (determines the order in the bar)
const STATUS_PRIORITY = ["upToDate", "draft", "needsReview", "empty"] as const;
type StatusType = (typeof STATUS_PRIORITY)[number];

export function FrameworkBarChart({ byFramework }: FrameworkBarChartProps) {
  const t = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  // Check scroll position and update indicators
  const checkScrollPosition = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
      setCanScrollUp(scrollTop > 10);
    }
  };

  // Set up scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollPosition);
      // Initial check
      checkScrollPosition();

      // Check again after content might have changed
      const timer = setTimeout(checkScrollPosition, 100);

      return () => {
        container.removeEventListener("scroll", checkScrollPosition);
        clearTimeout(timer);
      };
    }
  }, [byFramework]);

  // Recheck on window resize
  useEffect(() => {
    window.addEventListener("resize", checkScrollPosition);
    return () => window.removeEventListener("resize", checkScrollPosition);
  }, []);

  // Debug: Log the incoming data
  useEffect(() => {
    console.log("FrameworkBarChart - byFramework:", byFramework);

    // Check if status is present in the data
    if (byFramework) {
      const firstFramework = Object.values(byFramework)[0];
      if (firstFramework && firstFramework.length > 0) {
        console.log(
          "First framework's first item status:",
          firstFramework[0].status
        );
      }
    }
  }, [byFramework]);

  if (!byFramework || Object.keys(byFramework).length === 0) {
    return <div>No framework data available</div>;
  }

  // Create chart data for each framework
  const frameworkData = Object.entries(byFramework).map(
    ([frameworkId, items]) => {
      // Count items by status
      const statusCounts = {
        empty: 0,
        draft: 0,
        needsReview: 0,
        upToDate: 0,
      };

      // Use for...of instead of forEach
      for (const item of items) {
        statusCounts[item.status]++;
      }

      // Debug: Log status counts for each framework
      console.log(`Status counts for framework ${frameworkId}:`, statusCounts);

      return {
        id: frameworkId,
        name: frameworkId,
        totalItems: items.length,
        items,
        statusCounts,
      };
    }
  );

  // Sort by count in descending order
  frameworkData.sort((a, b) => b.totalItems - a.totalItems);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[300px] overflow-y-auto pr-2">
        <div className="space-y-8">
          {frameworkData.map((framework) => {
            // Create chart data for this framework with status breakdown
            const chartData: ChartDataItem[] = [];

            // Add statuses in priority order
            for (const status of STATUS_PRIORITY) {
              if (framework.statusCounts[status] > 0) {
                chartData.push({
                  key: status,
                  label: getStatusLabel(status, t),
                  value: framework.statusCounts[status],
                  color: getStatusColor(status),
                });
              }
            }

            return (
              <div key={framework.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm">{framework.name}</p>
                  <span className="text-sm text-muted-foreground">
                    {framework.totalItems} {t("evidence.items")}
                  </span>
                </div>

                {/* Bar chart for this framework with status breakdown */}
                <HorizontalBarChart
                  data={chartData}
                  showZeroValues={false}
                  valueFormatter={(value) => `${value}`}
                  height={12}
                />

                {/* Legend - similar to policies-by-assignee.tsx */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {STATUS_PRIORITY.map((status) => {
                    if (framework.statusCounts[status] > 0) {
                      return (
                        <div key={status} className="flex items-center gap-1">
                          <div className={`size-2 ${STATUS_COLORS[status]}`} />
                          <span>
                            {getStatusLabel(status, t)} (
                            {framework.statusCounts[status]})
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll indicators */}
      {canScrollUp && (
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent flex justify-center items-center pointer-events-none">
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {canScrollDown && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent flex justify-center items-center pointer-events-none">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// Helper function to get status label
function getStatusLabel(status: StatusType, t: any): string {
  switch (status) {
    case "upToDate":
      return t("evidence.status.up_to_date");
    case "needsReview":
      return t("evidence.status.needs_review");
    case "draft":
      return t("evidence.status.draft");
    case "empty":
      return t("evidence.status.empty");
    default:
      return status;
  }
}

// Helper function to get status color
function getStatusColor(status: StatusType): string {
  switch (status) {
    case "upToDate":
      return "#10b981"; // Green
    case "draft":
      return "#f59e0b"; // Amber
    case "needsReview":
      return "#ef4444"; // Red
    case "empty":
      return "#6b7280"; // Gray
    default:
      return "#6b7280"; // Default gray
  }
}
