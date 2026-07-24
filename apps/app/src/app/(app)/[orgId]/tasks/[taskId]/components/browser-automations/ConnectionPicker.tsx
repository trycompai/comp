'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import type { BrowserAuthProfileStatus } from '../../hooks/types';
import type { ConnectionRef } from './InstructionComposer';

function statusColor(status: BrowserAuthProfileStatus): string {
  if (status === 'verified') return 'var(--success)';
  if (status === 'needs_reauth' || status === 'blocked') return 'var(--warning)';
  return 'var(--muted-foreground)';
}

interface ConnectionPickerProps {
  connections: ConnectionRef[];
  value: string;
  onChange: (profileId: string) => void;
}

/** "Runs on …" — pick which connection (saved vendor login) a step runs under. */
export function ConnectionPicker({ connections, value, onChange }: ConnectionPickerProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Pick a connection">
          {(selectedValue: string | null) =>
            connections.find((item) => item.profileId === selectedValue)?.hostname ??
            'Pick a connection'
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {connections.map((connection) => (
          <SelectItem key={connection.profileId} value={connection.profileId}>
            <span className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: statusColor(connection.status) }}
              />
              {connection.hostname}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
