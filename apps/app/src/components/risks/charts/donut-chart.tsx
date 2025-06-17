'use client';

import { ClientTooltip, TooltipTrigger } from '@comp/ui/chart-tooltip';
import { type PieArcDatum, arc, pie } from 'd3';

interface ChartItem {
  name: string;
  value: number;
  status?: string;
}

interface DonutChartProps {
  data: ChartItem[];
  colors?: string[];
  showLabels?: boolean;
}

export function DonutChart({
  data,
  colors = ['#7e4cfe', '#895cfc', '#956bff', '#a37fff', '#b291fd', '#b597ff'],
  showLabels = true,
}: DonutChartProps) {
  const radius = 420; // Chart base dimensions
  const gap = 0.01; // Gap between slices
  const lightStrokeEffect = 10; // 3d light effect around the slice

  // Pie layout and arc generator
  const pieLayout = pie<ChartItem>()
    .value((d) => d.value)
    .padAngle(gap); // Creates a gap between slices

  // Adjust innerRadius to create a donut shape
  const innerRadius = radius / 1.625;
  const arcGenerator = arc<PieArcDatum<ChartItem>>()
    .innerRadius(innerRadius)
    .outerRadius(radius)
    .cornerRadius(lightStrokeEffect + 2);

  // Create an arc generator for the clip path
  const arcClip = arc<PieArcDatum<ChartItem>>()
    .innerRadius(innerRadius + lightStrokeEffect / 2)
    .outerRadius(radius)
    .cornerRadius(lightStrokeEffect + 2);

  const labelRadius = radius * 0.825;
  const arcLabel = arc<PieArcDatum<ChartItem>>().innerRadius(labelRadius).outerRadius(labelRadius);

  const arcs = pieLayout(data);

  // Calculate the angle for each slice
  function computeAngle(d: PieArcDatum<ChartItem>) {
    return ((d.endAngle - d.startAngle) * 180) / Math.PI;
  }

  // Minimum angle to display text
  const minAngle = 20; // Adjust this value as needed

  // If no data or all values are 0, return null
  if (data.length === 0 || data.every((item) => item.value === 0)) {
    return null;
  }

  return (
    <div className="relative">
      <svg
        viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`}
        className="mx-auto max-w-[16rem] overflow-visible"
      >
        <defs>
          {arcs.map((d, i) => {
            // Create stable, unique keys based on data
            const keyBase = `donut-c0-${d.data.name}-${d.data.value}`;
            // Keep the same ID format to maintain references
            const clipId = `donut-c0-clip-${i}`;
            const gradientId = `donut-c0-gradient-${i}`;

            return (
              <clipPath key={`clip-${keyBase}`} id={clipId}>
                <path d={arcClip(d) || undefined} />
                <linearGradient key={`gradient-${keyBase}`} id={gradientId}>
                  <stop offset="55%" stopColor={colors[i]} stopOpacity={0.95} />
                </linearGradient>
              </clipPath>
            );
          })}
        </defs>

        {/* Slices */}
        {arcs.map((d, i) => {
          const angle = computeAngle(d);
          const centroid = arcLabel.centroid(d);
          if (d.endAngle > Math.PI) {
            centroid[0] += 10;
            centroid[1] += 10;
          } else {
            centroid[0] -= 10;
            centroid[1] -= 0;
          }
          return (
            <ClientTooltip key={`tooltip-${d.data.name}-${d.data.value}`}>
              <TooltipTrigger>
                <g key={`slice-${d.data.name}-${d.data.value}`}>
                  <g clipPath={`url(#donut-c0-clip-${i})`}>
                    <path
                      fill={`url(#donut-c0-gradient-${i})`}
                      stroke="#16171B"
                      strokeWidth={lightStrokeEffect}
                      d={arcGenerator(d) || undefined}
                    />
                  </g>
                </g>
              </TooltipTrigger>
            </ClientTooltip>
          );
        })}
      </svg>
    </div>
  );
}
