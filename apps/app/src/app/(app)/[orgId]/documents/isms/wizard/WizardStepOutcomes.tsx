'use client';

import { Section } from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import { WizardEditableList } from './WizardEditableList';
import { WizardField } from './WizardField';
import { WizardObjectivesEditor } from './WizardObjectivesEditor';
import type { WizardFormValues } from './wizard-types';

interface WizardStepOutcomesProps {
  control: Control<WizardFormValues>;
}

/**
 * Step 6 — Targets & outcomes.
 * Q11: confirm/override the default information security objectives & targets.
 * Q12: confirm/override the default intended outcomes of the ISMS.
 */
export function WizardStepOutcomes({ control }: WizardStepOutcomesProps) {
  return (
    <Section
      title="Targets & outcomes"
      description="The measurable objectives and intended outcomes your ISMS is built to achieve."
      gap="8"
    >
      <Controller
        control={control}
        name="objectives"
        render={({ field }) => (
          <WizardField
            label="Information security objectives & targets"
            helper="Pre-filled defaults. Confirm, edit, add, or remove until they reflect your goals."
          >
            <WizardObjectivesEditor items={field.value ?? []} onChange={field.onChange} />
          </WizardField>
        )}
      />

      <Controller
        control={control}
        name="intendedOutcomes"
        render={({ field }) => {
          const items = Array.isArray(field.value) ? field.value : [];
          return (
            <WizardField
              label="Intended outcomes of the ISMS"
              helper="The outcomes your ISMS is meant to achieve. Confirm or adjust the defaults."
            >
              <WizardEditableList
                label="Intended outcomes"
                items={items}
                emptyText="No intended outcomes yet. Add at least one."
                onAdd={(item) => field.onChange([...items, item])}
                onRemove={(index) => field.onChange(items.filter((_, i) => i !== index))}
              />
            </WizardField>
          );
        }}
      />
    </Section>
  );
}
