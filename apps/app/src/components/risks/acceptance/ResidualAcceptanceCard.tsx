'use client';

import { Badge, Button, Spinner, Text } from '@trycompai/design-system';
import { CheckmarkOutline } from '@trycompai/design-system/icons';
import type { Impact, Likelihood } from '@db';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  useAcceptances,
  type AcceptanceSubjectKind,
  type RiskAcceptanceEvent,
} from '@/hooks/use-risk-acceptances';
import { getRiskScore, LEVEL_LABEL } from '@/lib/risk-score';
import { RecordAcceptanceDialog, type AcceptorOption } from './RecordAcceptanceDialog';

interface ResidualAcceptanceCardProps {
  kind: AcceptanceSubjectKind;
  subjectId: string;
  /** Live residual rating — drives the confirmed level + client stale hints. */
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  /** Owner (assignee) member id — the default acceptor. */
  ownerId: string | null;
  /** Active members offered as acceptor. */
  acceptorOptions: AcceptorOption[];
  /** Gate: risk:update / vendor:update. */
  canUpdate: boolean;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

function AcceptanceHistoryRow({ event }: { event: RiskAcceptanceEvent }) {
  return (
    <li className="flex flex-col gap-0.5 border-t py-2 first:border-t-0">
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{event.acceptedByName}</span>
        <span className="text-muted-foreground">
          accepted at {event.levelLabel} on {formatDate(event.createdAt)}
        </span>
        {event.stale && <Badge variant="destructive">Stale</Badge>}
      </span>
      {event.notes && <span className="text-xs text-muted-foreground">{event.notes}</span>}
    </li>
  );
}

/**
 * Residual-risk acceptance (ISO 27001 6.1.3(f)) for a risk or a vendor risk:
 * the current acceptance state, the "Record risk-owner acceptance" action, and
 * the immutable acceptance history. When the residual rating changes after an
 * acceptance, the server marks it stale and this card asks for a re-record.
 */
export function ResidualAcceptanceCard({
  kind,
  subjectId,
  residualLikelihood,
  residualImpact,
  ownerId,
  acceptorOptions,
  canUpdate,
}: ResidualAcceptanceCardProps) {
  const { acceptances, latest, isLoading, recordAcceptance } = useAcceptances(kind, subjectId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currentLevelLabel = LEVEL_LABEL[getRiskScore(residualLikelihood, residualImpact).level];
  const subjectLabel = kind === 'risk' ? 'risk' : "vendor's risk";

  const handleRecord = async (input: Parameters<typeof recordAcceptance>[0]) => {
    try {
      await recordAcceptance(input);
      toast.success('Acceptance recorded');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to record acceptance');
      throw caught;
    }
  };

  return (
    <div className="bg-background flex flex-col gap-3 rounded-md border border-border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-normal tracking-[-0.01em]">Residual risk acceptance</h3>
            {latest && !latest.stale && <Badge variant="accent">Accepted</Badge>}
            {latest?.stale && <Badge variant="destructive">Stale</Badge>}
            {!latest && !isLoading && <Badge variant="secondary">Awaiting acceptance</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">
            The risk owner&apos;s formal, dated acceptance of the residual risk (ISO 27001
            6.1.3(f)). Rendered into the Risk Treatment Plan.
          </div>
        </div>
        {canUpdate && (
          <Button
            type="button"
            variant="secondary"
            iconLeft={<CheckmarkOutline size={16} />}
            onClick={() => setDialogOpen(true)}
          >
            Record risk-owner acceptance
          </Button>
        )}
      </div>

      {isLoading && acceptances.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : latest ? (
        <div className="flex flex-col gap-1">
          <Text>
            Residual risk accepted by {latest.acceptedByName} on {formatDate(latest.createdAt)} at{' '}
            {latest.levelLabel}.
          </Text>
          {latest.stale && (
            <Text variant="muted">
              The residual level has changed to {currentLevelLabel} since this acceptance — record
              a fresh acceptance. Previous acceptances are kept in the history below.
            </Text>
          )}
        </div>
      ) : (
        <Text variant="muted">
          No acceptance recorded yet. The current residual level is {currentLevelLabel}.
        </Text>
      )}

      {acceptances.length > 1 && (
        <div className="flex flex-col gap-1">
          <Text variant="muted" weight="semibold">
            History
          </Text>
          <ul className="flex flex-col">
            {acceptances.slice(1).map((event) => (
              <AcceptanceHistoryRow key={event.id} event={event} />
            ))}
          </ul>
        </div>
      )}

      <RecordAcceptanceDialog
        key={`${dialogOpen}:${ownerId ?? 'none'}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subjectLabel={subjectLabel}
        residualLevelLabel={currentLevelLabel}
        acceptorOptions={acceptorOptions}
        defaultAcceptorId={ownerId}
        onRecord={handleRecord}
      />
    </div>
  );
}
