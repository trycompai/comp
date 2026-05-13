'use client';

import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Text,
} from '@trycompai/design-system';
import {
  ChevronDown,
  Document,
  FingerprintRecognition,
  Hashtag,
  Portfolio,
  Security,
  UserMultiple,
} from '@trycompai/design-system/icons';
import type { ComponentType } from 'react';
import { useState } from 'react';

type IconComponent = ComponentType<{ size?: number }>;

interface ScopeRow {
  id: string;
  icon: IconComponent;
  label: string;
  description: string;
  required?: boolean;
}

const SCOPE_ROWS: ScopeRow[] = [
  {
    id: 'required',
    icon: Security,
    label: 'Required for compliance',
    description: 'SOC 2 CC1.4, ISO 27001 A.6.1.1',
    required: true,
  },
  {
    id: 'identity',
    icon: FingerprintRecognition,
    label: 'Identity verification',
    description: 'Government ID + selfie match',
  },
  {
    id: 'references',
    icon: UserMultiple,
    label: 'Reference checks',
    description: '2–3 personal references contacted',
  },
  {
    id: 'report',
    icon: Document,
    label: 'Full audited report',
    description: 'Court records, criminal, civil',
  },
  {
    id: 'employment',
    icon: Portfolio,
    label: 'Previous employer verification',
    description: 'Last 7 years, dates and titles',
  },
  {
    id: 'social',
    icon: Hashtag,
    label: 'Social media screening',
    description: 'Public posts, flagged content',
  },
];

export function BackgroundCheckScopePanel() {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-5">
      <CollapsibleTrigger
        className="flex cursor-pointer items-center gap-1.5 bg-transparent p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
        render={<button type="button" />}
      >
        <ChevronDown
          size={10}
          className={`text-muted-foreground transition-transform duration-200 ${
            open ? '' : '-rotate-90'
          }`}
        />
        <Text size="sm" variant="muted">
          What&apos;s verified in this check ({SCOPE_ROWS.length})
        </Text>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2.5 overflow-hidden rounded-[var(--radius)] border bg-muted">
        {SCOPE_ROWS.map((row, index) => (
          <ScopeRowItem key={row.id} row={row} isFirst={index === 0} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ScopeRowItem({ row, isFirst }: { row: ScopeRow; isFirst: boolean }) {
  const Icon = row.icon;
  return (
    <div
      className={`grid items-center gap-3 px-3.5 py-2.5 text-sm ${
        isFirst ? '' : 'border-t border-border'
      }`}
      style={{ gridTemplateColumns: '20px 1fr auto' }}
    >
      <span className="text-muted-foreground">
        <Icon size={16} />
      </span>
      <div>
        <div>{row.label}</div>
        <div className="text-xs text-muted-foreground">{row.description}</div>
      </div>
      {row.required ? (
        <Badge variant="default">Required</Badge>
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
}
