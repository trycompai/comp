"use client";

import React, { useEffect } from "react";
import type { CSSProperties, Key } from "react";

export interface ChartDataItem<K = string> {
  key: K;
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps<K = string> {
  data: ChartDataItem<K>[];
  title?: string;
  height?: number;
  showZeroValues?: boolean;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
}

// Default array of colors using Tailwind's HSL color palette
const defaultColors = [
  "#8b5cf6", // Purple (primary)
  "#06b6d4", // Cyan (secondary)
  "#10b981", // Emerald (accent)
  "#ef4444", // Red (destructive)
  "#6b7280", // Gray (muted)
];

export function HorizontalBarChart<K extends Key>({
  data,
  title,
  height = 12, // Default bar height matching policies-by-assignee
  showZeroValues = true,
  colors = defaultColors,
  valueFormatter = (value) => `${value}`,
  showLegend = false,
}: HorizontalBarChartProps<K>) {
  // Debug: Log the incoming data
  useEffect(() => {
    console.log("HorizontalBarChart - data:", data);
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="h-3 bg-muted">No data available</div>;
  }

  // Assign colors if not provided
  const chartData = data.map((item, index) => {
    // For single color arrays, use that color for all bars
    const color =
      colors.length === 1
        ? colors[0]
        : item.color || colors[index % colors.length];

    return {
      ...item,
      color,
    };
  });

  // Filter out zero values if not showing them
  const filteredData = showZeroValues
    ? chartData
    : chartData.filter((d) => d.value > 0);

  // Debug: Log the filtered data
  useEffect(() => {
    console.log("HorizontalBarChart - filteredData:", filteredData);
  }, [filteredData]);

  // Calculate the total value for percentage calculations
  const totalValue = filteredData.reduce((sum, item) => sum + item.value, 0);

  if (totalValue === 0) {
    return <div className="h-3 bg-muted" />;
  }

  const barHeight = height;
  const gap = 0.3; // Add gap between segments like in policies-by-assignee
  const totalWidth = totalValue + gap * (filteredData.length - 1);
  let cumulativeWidth = 0;
  const cornerRadius = 0; // No rounded corners in the policies-by-assignee chart

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-medium">{title}</h3>}

      <div
        className="relative h-[var(--height)]"
        style={
          {
            "--marginTop": "0px",
            "--marginRight": "0px",
            "--marginBottom": "0px",
            "--marginLeft": "0px",
            "--height": `${barHeight}px`,
          } as CSSProperties
        }
      >
        <div
          className="absolute inset-0
            h-[calc(100%-var(--marginTop)-var(--marginBottom))]
            w-[calc(100%-var(--marginLeft)-var(--marginRight))]
            translate-x-[var(--marginLeft)]
            translate-y-[var(--marginTop)]
            overflow-visible"
        >
          {filteredData.map((d, index) => {
            const barWidth = (d.value / totalWidth) * 100;
            const xPosition = cumulativeWidth;
            cumulativeWidth += barWidth + gap;

            return (
              <div
                key={d.key}
                className="relative"
                style={{
                  width: `${barWidth}%`,
                  height: `${barHeight}px`,
                  left: `${xPosition}%`,
                  position: "absolute",
                }}
              >
                <div
                  className="bg-gradient-to-b"
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: d.color,
                    borderRadius: `${cornerRadius}px`,
                  }}
                  title={`${d.label}: ${valueFormatter(d.value)}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
          {filteredData.map((item) => (
            <div
              key={`legend-${String(item.key)}`}
              className="flex items-center gap-1"
            >
              <div className="size-2" style={{ backgroundColor: item.color }} />
              <span>
                {item.label} ({valueFormatter(item.value)})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
