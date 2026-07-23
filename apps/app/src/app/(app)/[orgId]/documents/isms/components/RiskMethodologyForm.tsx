'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Label, Text, Textarea } from '@trycompai/design-system';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { IsmsRiskMethodologyNarrative } from '../isms-types';
import { MethodologyLabelledList } from './MethodologyLabelledList';
import {
  METHODOLOGY_IMPACT_LABELS,
  METHODOLOGY_LEVEL_LABELS,
  METHODOLOGY_LIKELIHOOD_LABELS,
  METHODOLOGY_TREATMENT_LABELS,
} from './risk-methodology-constants';
import { RiskLevelMatrixPreview } from './RiskLevelMatrixPreview';

const methodologySchema = z.object({
  purpose: z.string().min(1, 'Purpose is required'),
  scope: z.string().min(1, 'Scope is required'),
  approach: z.string().min(1, 'Approach is required'),
  likelihoodDescriptions: z.array(z.string().min(1, 'Required')).length(5),
  impactDescriptions: z.array(z.string().min(1, 'Required')).length(5),
  acceptanceThresholds: z.array(z.string().min(1, 'Required')).length(5),
  treatmentOptions: z.array(z.string().min(1, 'Required')).length(4),
  responsibilities: z.string().min(1, 'Responsibilities are required'),
  frequency: z.string().min(1, 'Frequency is required'),
  documentation: z.string().min(1, 'Documentation approach is required'),
});

export type RiskMethodologyValues = z.infer<typeof methodologySchema>;

interface RiskMethodologyFormProps {
  narrative: IsmsRiskMethodologyNarrative;
  canEdit: boolean;
  onSave: (values: RiskMethodologyValues) => Promise<void>;
}

const padded = (values: string[], length: number): string[] =>
  Array.from({ length }, (_, index) => values[index] ?? '');

function toDefaults(narrative: IsmsRiskMethodologyNarrative): RiskMethodologyValues {
  return {
    purpose: narrative.purpose ?? '',
    scope: narrative.scope ?? '',
    approach: narrative.approach ?? '',
    likelihoodDescriptions: padded(narrative.likelihoodDescriptions, 5),
    impactDescriptions: padded(narrative.impactDescriptions, 5),
    acceptanceThresholds: padded(narrative.acceptanceThresholds, 5),
    treatmentOptions: padded(narrative.treatmentOptions, 4),
    responsibilities: narrative.responsibilities ?? '',
    frequency: narrative.frequency ?? '',
    documentation: narrative.documentation ?? '',
  };
}

const PROSE_FIELDS = [
  {
    name: 'purpose',
    label: 'Purpose',
    helper: 'What this methodology is for and which clause it satisfies (6.1.2).',
    rows: 3,
  },
  {
    name: 'scope',
    label: 'Scope',
    helper: 'Which risks the methodology applies to, including supplier risks.',
    rows: 3,
  },
  {
    name: 'approach',
    label: 'Risk assessment approach',
    helper: 'How risks are identified and assessed (default: asset-based, inherent + residual).',
    rows: 4,
  },
] as const;

const CLOSING_FIELDS = [
  {
    name: 'responsibilities',
    label: 'Risk-owner responsibilities',
    helper: 'What every named risk owner is accountable for, including residual-risk acceptance.',
    rows: 4,
  },
  {
    name: 'frequency',
    label: 'Frequency of assessment',
    helper: 'How often risks are reviewed (default: quarterly review, annual formal reassessment).',
    rows: 3,
  },
  {
    name: 'documentation',
    label: 'Documentation approach',
    helper: 'Where risks, treatments, and acceptance events are held and which documents derive from them.',
    rows: 3,
  },
] as const;

export function RiskMethodologyForm({ narrative, canEdit, onSave }: RiskMethodologyFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<RiskMethodologyValues>({
    resolver: zodResolver(methodologySchema),
    defaultValues: toDefaults(narrative),
  });

  const handleSave = handleSubmit(async (values) => {
    await onSave(values);
  });

  const proseField = ({
    name,
    label,
    helper,
    rows,
  }: {
    name: 'purpose' | 'scope' | 'approach' | 'responsibilities' | 'frequency' | 'documentation';
    label: string;
    helper: string;
    rows: number;
  }) => (
    <div key={name} className="flex flex-col gap-2">
      <Label htmlFor={`methodology-${name}`}>{label}</Label>
      <div className="text-muted-foreground">
        <Text variant="muted">{helper}</Text>
      </div>
      {canEdit ? (
        <div className="flex flex-col gap-1">
          <Controller
            control={control}
            name={name}
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} id={`methodology-${name}`} rows={rows} aria-label={label} />
            )}
          />
          {errors[name] && (
            <span className="text-xs text-destructive">{errors[name]?.message}</span>
          )}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm">{narrative[name] || '—'}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-8">
      {PROSE_FIELDS.map(proseField)}

      <MethodologyLabelledList<RiskMethodologyValues>
        title="Likelihood scale"
        helper="What each of the five likelihood levels means for your organization."
        labels={METHODOLOGY_LIKELIHOOD_LABELS}
        name="likelihoodDescriptions"
        control={control}
        canEdit={canEdit}
        values={watch('likelihoodDescriptions')}
      />

      <MethodologyLabelledList<RiskMethodologyValues>
        title="Impact scale"
        helper="What each of the five impact levels means for your organization."
        labels={METHODOLOGY_IMPACT_LABELS}
        name="impactDescriptions"
        control={control}
        canEdit={canEdit}
        values={watch('impactDescriptions')}
      />

      <div className="flex flex-col gap-2">
        <Text weight="semibold">Risk level matrix</Text>
        <RiskLevelMatrixPreview />
      </div>

      <MethodologyLabelledList<RiskMethodologyValues>
        title="Acceptance thresholds"
        helper="The acceptance requirement each risk level triggers (default: low levels accepted, medium with owner sign-off, high levels must be treated)."
        labels={METHODOLOGY_LEVEL_LABELS}
        name="acceptanceThresholds"
        control={control}
        canEdit={canEdit}
        values={watch('acceptanceThresholds')}
      />

      <MethodologyLabelledList<RiskMethodologyValues>
        title="Treatment options"
        helper="What each treatment strategy means. The labels match the Risks module's strategies with their ISO 27001 option names."
        labels={METHODOLOGY_TREATMENT_LABELS}
        name="treatmentOptions"
        control={control}
        canEdit={canEdit}
        values={watch('treatmentOptions')}
      />

      {CLOSING_FIELDS.map(proseField)}

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving...' : 'Save methodology'}
          </Button>
        </div>
      )}
    </form>
  );
}
