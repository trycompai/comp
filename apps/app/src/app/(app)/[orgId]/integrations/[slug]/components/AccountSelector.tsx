'use client';

import type { ConnectionListItem } from '@/hooks/use-integration-platform';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@trycompai/design-system';
import { getConnectionDisplayLabel } from './connection-display';

interface AccountSelectorProps {
  connections: ConnectionListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Sit inside a parent toolbar — no outer border (parent provides the frame). */
  embedded?: boolean;
  /** Tighter label size for dense layouts. */
  compact?: boolean;
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-500',
  pending: 'bg-yellow-500',
  error: 'bg-red-500',
};

export function AccountSelector({
  connections,
  selectedId,
  onSelect,
  embedded = false,
  compact = false,
}: AccountSelectorProps) {
  const selected = connections.find((c) => c.id === selectedId);
  const selectedName = selected ? getConnectionDisplayLabel(selected) : 'Select account';

  const triggerStyle = embedded
    ? {
        width: '100%' as const,
        minWidth: 0,
        justifyContent: 'start' as const,
        gap: 6,
        border: 'none',
        background: 'transparent',
        boxShadow: 'none',
      }
    : {
        width: '100%' as const,
        justifyContent: 'start' as const,
        gap: 6,
        minWidth: 0,
      };

  return (
    <Select
      value={selectedId}
      onValueChange={(value) => {
        if (value) onSelect(value);
      }}
    >
      <SelectTrigger size="sm" style={triggerStyle}>
        <span
          className={
            compact
              ? 'truncate text-[11px] leading-tight tabular-nums'
              : 'truncate text-xs tabular-nums'
          }
        >
          {selectedName}
        </span>
      </SelectTrigger>
      <SelectContent>
        {connections.map((conn) => {
          const dot = STATUS_DOT[conn.status] ?? 'bg-gray-400';
          return (
            <SelectItem key={conn.id} value={conn.id}>
              <span className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                {getConnectionDisplayLabel(conn)}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
