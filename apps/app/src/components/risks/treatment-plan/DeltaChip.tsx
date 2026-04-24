'use client';

import { RiskScoreBadge } from '@/components/risks/RiskScoreBadge';
import { getRiskScore } from '@/lib/risk-score';
import { Impact, Likelihood } from '@db';
import { HStack, Text } from '@trycompai/design-system';

interface DeltaChipProps {
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
}

export function DeltaChip({
  inherentLikelihood,
  inherentImpact,
  residualLikelihood,
  residualImpact,
}: DeltaChipProps) {
  const inherent = getRiskScore(inherentLikelihood, inherentImpact);
  const residual = getRiskScore(residualLikelihood, residualImpact);
  const delta = residual.score - inherent.score;
  const deltaLabel =
    delta === 0 ? 'no change' : `${delta > 0 ? '+' : ''}${delta} from treatment plan`;

  return (
    <HStack gap="xs" align="center">
      <RiskScoreBadge likelihood={inherentLikelihood} impact={inherentImpact} />
      <Text size="sm" variant="muted">
        →
      </Text>
      <RiskScoreBadge likelihood={residualLikelihood} impact={residualImpact} />
      <Text size="xs" variant="muted">
        {deltaLabel}
      </Text>
    </HStack>
  );
}
