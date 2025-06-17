'use client';

import { ClientTooltip } from '@comp/ui/chart-tooltip';
import { format, max, scaleBand, scaleLinear } from 'd3';
import { type CSSProperties } from 'react';

const STATUS_COLORS = {
  open: 'bg-[var(--chart-open)]',
  pending: 'bg-[var(--chart-pending)]',
  closed: 'bg-[var(--chart-closed)]',
  archived: 'bg-[var(--chart-archived)]',
};

interface StatusData {
  name: string;
  value: number;
}

interface StatusChartProps {
  data: StatusData[];
}

export function StatusChart({ data }: StatusChartProps) {
  // Ensure all statuses are represented in the data, even with 0 values
  const ensureAllStatuses = (inputData: StatusData[]): StatusData[] => {
    // First, capitalize all existing status names
    const result = inputData.map((item) => ({
      ...item,
      name: item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase(),
    }));

    const statusNames = Object.keys(STATUS_COLORS);

    // Add missing statuses with 0 value
    for (const status of statusNames) {
      const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
      if (!result.some((item) => item.name.toLowerCase() === status)) {
        result.push({ name: capitalized, value: 0 });
      }
    }

    return result;
  };

  const sortedData = [...ensureAllStatuses(data)].sort((a, b) => b.value - a.value);

  if (sortedData.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[300px] items-center justify-center">
        No statuses with risks found
      </div>
    );
  }

  const barHeight = 40; // Fixed height for each bar in pixels
  const barGap = 16; // Gap between bars in pixels
  const minChartHeight = 300; // Minimum chart height

  // Calculate dynamic chart height based on number of departments
  const chartHeight = Math.max(
    minChartHeight,
    (barHeight + barGap) * sortedData.length + 40, // Extra padding at top/bottom
  );

  // Get the maximum value for scaling
  const maxValue = max(sortedData.map((d) => d.value)) ?? 1;

  // Scales
  const yScale = scaleBand()
    .domain(sortedData.map((d) => d.name))
    .range([0, 100])
    .padding(0.25);

  const xScale = scaleLinear().domain([0, maxValue]).range([0, 100]);

  const marginLeft = 70;
  const marginRight = 20;
  const marginBottom = 20;

  const getBarKey = (item: StatusData) => `bar-${item.name}-${item.value}`;
  const getTickKey = (value: number) => `tick-${value}`;
  const getGridKey = (value: number, position = 0) =>
    `grid-${value.toString().replace('.', '-')}-${position}`;
  const getLabelKey = (item: StatusData) => `label-${item.name}`;

  const getStatusColor = (statusName: string) => {
    const normalizedName = statusName.toLowerCase();
    return STATUS_COLORS[normalizedName as keyof typeof STATUS_COLORS] || 'bg-gray-400';
  };

  // Generate appropriate tick values based on max value
  const generateTickValues = () => {
    // For small values, generate specific tick values
    if (maxValue <= 1) return [0, 1];
    if (maxValue <= 2) return [0, 1, 2];
    if (maxValue <= 5) return [0, 1, 2, 3, 4, 5];
    if (maxValue <= 10) return [0, 2, 4, 6, 8, 10];

    // For larger values, let D3 handle it with a reasonable number of ticks
    const tickCount = Math.min(maxValue, 6); // Limit number of ticks
    return xScale.ticks(tickCount).map(Number);
  };

  const tickValues = generateTickValues();

  return (
    <ClientTooltip>
      <div
        className="relative w-full"
        style={
          {
            height: `${chartHeight}px`,
            '--marginTop': '0px',
            '--marginRight': `${marginRight}px`,
            '--marginBottom': `${marginBottom}px`,
            '--marginLeft': `${marginLeft}px`,
          } as CSSProperties
        }
      >
        <div className="absolute inset-0 z-10 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[calc(100%-var(--marginLeft)-var(--marginRight))] translate-x-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
          {sortedData.map((d, index) => {
            const barWidth = d.value === 0 ? 3 : xScale(d.value);
            const fixedBarHeightPercentage = (barHeight / chartHeight) * 100;

            // Calculate exact position to align with labels
            // Get center point of the band for this item
            const bandCenter = yScale(d.name)! + yScale.bandwidth() / 2;
            // Position bar so its center aligns with the band center
            const barTopPosition = bandCenter - fixedBarHeightPercentage / 2;

            return (
              <div
                key={getBarKey(d)}
                style={{
                  left: '0',
                  top: `${barTopPosition}%`,
                  width: `${barWidth}%`,
                  height: `${fixedBarHeightPercentage}%`,
                }}
                className={`absolute ${getStatusColor(d.name)} ${d.value === 0 ? 'opacity-40' : ''} dark:opacity-90`}
                data-tip={`${d.name}: ${d.value}`}
              />
            );
          })}
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {tickValues.map((value, position) => {
              const uniqueKey = getGridKey(value, position);
              return (
                <g
                  key={uniqueKey}
                  transform={`translate(${xScale(value)},0)`}
                  className="text-muted"
                >
                  <line
                    y1={0}
                    y2={100}
                    stroke="currentColor"
                    strokeDasharray="6,5"
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>

          {tickValues.map((value) => (
            <div
              key={getTickKey(value)}
              style={{
                left: `${xScale(value)}%`,
                top: '100%',
              }}
              className="text-muted-foreground absolute -translate-x-1/2 text-xs tabular-nums"
            >
              {Number.isInteger(value) ? format(',')(value) : value.toFixed(2)}
            </div>
          ))}
        </div>

        <div className="h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
          {sortedData.map((entry) => (
            <span
              key={getLabelKey(entry)}
              style={{
                left: '0',
                top: `${yScale(entry.name)! + yScale.bandwidth() / 2}%`,
                width: `${marginLeft - 2}px`,
              }}
              className="text-muted-foreground absolute -translate-y-1/2 truncate pr-1 text-right text-xs font-medium"
            >
              {entry.name}
            </span>
          ))}
        </div>
      </div>
    </ClientTooltip>
  );
}
