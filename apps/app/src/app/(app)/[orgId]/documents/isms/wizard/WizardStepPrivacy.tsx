'use client';

import { Input, RadioGroup, RadioGroupItem } from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import { WizardField } from './WizardField';
import { EU_REP_LABELS, EU_REP_STATUSES, type WizardFormValues } from './wizard-types';

interface WizardStepPrivacyProps {
  control: Control<WizardFormValues>;
}

/**
 * Step 4 — Privacy & data.
 * Q9: EU representative (GDPR Art. 27) — appointed / not required / pending,
 * plus the representative's name when appointed.
 */
export function WizardStepPrivacy({ control }: WizardStepPrivacyProps) {
  return (
    <div className="flex flex-col gap-8">
      <Controller
        control={control}
        name="euRep"
        render={({ field }) => {
          const value = field.value ?? { status: 'not_required', name: '' };
          return (
            <WizardField
              label="EU representative (GDPR Article 27)"
              helper="If you process EU personal data from outside the EU, you may need an EU representative."
            >
              <RadioGroup
                value={value.status}
                onValueChange={(next) =>
                  field.onChange({
                    status: next,
                    name: next === 'appointed' ? value.name : '',
                  })
                }
              >
                {EU_REP_STATUSES.map((status) => {
                  const id = `eu-rep-${status}`;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <RadioGroupItem value={status} id={id} aria-label={EU_REP_LABELS[status]} />
                      <label htmlFor={id} className="text-sm">
                        {EU_REP_LABELS[status]}
                      </label>
                    </div>
                  );
                })}
              </RadioGroup>
              {value.status === 'appointed' && (
                <Input
                  value={value.name}
                  onChange={(event) =>
                    field.onChange({ status: 'appointed', name: event.target.value })
                  }
                  placeholder="EU representative name"
                  aria-label="EU representative name"
                />
              )}
            </WizardField>
          );
        }}
      />
    </div>
  );
}
