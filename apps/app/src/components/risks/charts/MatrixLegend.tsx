'use client';

import { HStack, Stack, Text } from '@trycompai/design-system';

interface LegendItem {
  level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  label: string;
  range: string;
  color: string;
}

const ITEMS: LegendItem[] = [
  { level: 'very-low', label: 'Very Low', range: 'Raw 1', color: 'bg-emerald-500/30' },
  { level: 'low', label: 'Low', range: 'Raw 2–4', color: 'bg-green-500/30' },
  { level: 'medium', label: 'Medium', range: 'Raw 5–9', color: 'bg-yellow-500/30' },
  { level: 'high', label: 'High', range: 'Raw 10–16', color: 'bg-orange-500/30' },
  { level: 'very-high', label: 'Very High', range: 'Raw 17–25', color: 'bg-red-500/30' },
];

export function MatrixLegend() {
  return (
    <HStack gap="md" wrap="wrap">
      {ITEMS.map((item) => (
        <div key={item.level} className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-sm ${item.color}`} />
          <Stack gap="none">
            <Text size="xs" weight="medium">
              {item.label}
            </Text>
            <Text size="xs" variant="muted">
              {item.range}
            </Text>
          </Stack>
        </div>
      ))}
    </HStack>
  );
}
