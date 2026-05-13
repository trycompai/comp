'use client';

import { Badge, Stack, Text } from '@trycompai/design-system';
import {
  CheckmarkFilled,
  Document,
  Locked,
  MagicWand,
  Security,
  UserMultiple,
} from '@trycompai/design-system/icons';
import type { ComponentType } from 'react';

type IconComponent = ComponentType<{ size?: number }>;

const TRUST_SIGNALS: Array<{ icon: IconComponent; label: string }> = [
  { icon: Security, label: 'Biometric identity verification' },
  { icon: UserMultiple, label: 'Human-verified employment & references' },
  { icon: Locked, label: 'FCRA-compliant adjudication' },
  { icon: MagicWand, label: 'AI-augmented public-source research' },
];

const CHECKS_INCLUDED: Array<{ title: string; description: string }> = [
  {
    title: 'Identity & liveness',
    description:
      'Candidate uploads a government ID and records a live video. The face on the ID, the live capture, and the candidate’s public profile photo are matched against each other.',
  },
  {
    title: 'Employment confirmation',
    description:
      'Each past employer’s HR contact receives a secure verification link to confirm role and dates of employment directly — not just inferred from a profile.',
  },
  {
    title: 'Reference questionnaires',
    description:
      'Each professional reference receives a structured form. We record relationship confirmation, recommendation, and free-text response per reference.',
  },
  {
    title: 'Right-to-work documentation',
    description:
      'Work authorization is extracted from the candidate’s government identity document — passport, national ID, or work visa.',
  },
  {
    title: 'Cross-referenced public research',
    description:
      'LinkedIn and public-source profiles are aggregated by AI, then validated against the candidate’s submitted employment history and identity.',
  },
];

export function MethodologyTrustSignals() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-md border bg-background p-3"
        >
          <span className="text-primary">
            <Icon size={16} />
          </span>
          <Text size="sm" weight="medium">
            {label}
          </Text>
        </div>
      ))}
    </div>
  );
}

export function MethodologyIncluded() {
  return (
    <Stack gap="3">
      <Text size="sm" weight="medium">
        What’s included in every check
      </Text>
      <div className="grid gap-3 md:grid-cols-2">
        {CHECKS_INCLUDED.map((check) => (
          <div key={check.title} className="flex gap-2 rounded-md border p-3">
            <span className="mt-0.5 text-primary">
              <CheckmarkFilled size={16} />
            </span>
            <Stack gap="1">
              <Text size="sm" weight="medium">
                {check.title}
              </Text>
              <Text size="xs" variant="muted">
                {check.description}
              </Text>
            </Stack>
          </div>
        ))}
      </div>
    </Stack>
  );
}

export function MethodologyComplianceNote() {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="flex gap-3">
        <span className="mt-0.5 text-primary">
          <Document size={16} />
        </span>
        <Stack gap="1">
          <Text size="sm" weight="medium">
            FCRA-style adverse-action workflow
          </Text>
          <Text size="xs" variant="muted">
            Reports follow Fair Credit Reporting Act adverse-action
            conventions. Candidates can review and dispute findings before any
            decision is final.
          </Text>
        </Stack>
      </div>
    </div>
  );
}

/** Compact methodology banner for the top of the completed report. */
export function MethodologyReportBanner() {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <Stack gap="3">
        <Stack gap="1">
          <Text weight="medium">How this check was performed</Text>
          <Text size="xs" variant="muted">
            Every report combines biometric identity verification with direct
            employer and reference confirmation, plus AI-augmented public-source
            research — all under an FCRA-style adjudication workflow.
          </Text>
        </Stack>
        <div className="flex flex-wrap gap-1.5">
          {TRUST_SIGNALS.map(({ label }) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
      </Stack>
    </div>
  );
}
