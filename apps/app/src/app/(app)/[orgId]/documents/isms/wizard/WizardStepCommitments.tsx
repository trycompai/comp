'use client';

import { Input, Switch, Text } from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import { WizardField } from './WizardField';
import { WizardRegulatorSelect } from './WizardRegulatorSelect';
import type { WizardFormValues } from './wizard-types';

interface WizardStepCommitmentsProps {
  control: Control<WizardFormValues>;
  regulatorOptions: string[];
}

const CERT_BODY_SUGGESTIONS = ['BSI', 'A-LIGN', 'Schellman', 'Coalfire', 'Prescient Assurance'];

/**
 * Step 2 — External commitments.
 * Q3: certification body (free text + suggestions).
 * Q4: cyber / professional-indemnity insurance (yes/no + insurer name).
 * Q5: sector regulators reached via contract flow-down (multi-select + custom).
 */
export function WizardStepCommitments({ control, regulatorOptions }: WizardStepCommitmentsProps) {
  const options = Array.isArray(regulatorOptions) ? regulatorOptions : [];

  return (
    <div className="flex flex-col gap-8">
      <Controller
        control={control}
        name="certificationBody"
        render={({ field: { ref: _ref, ...field } }) => (
          <WizardField
            label="Certification body"
            helper="The accredited body that will audit and issue your certificate. Suggestions: BSI, A-LIGN, Schellman, Coalfire, Prescient Assurance."
          >
            <Input
              {...field}
              list="certification-body-suggestions"
              placeholder="Certification body name"
              aria-label="Certification body"
            />
            <datalist id="certification-body-suggestions">
              {CERT_BODY_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </WizardField>
        )}
      />

      <Controller
        control={control}
        name="insurance"
        render={({ field }) => {
          const value = field.value ?? { has: false, insurerName: '' };
          return (
            <WizardField
              label="Cyber / professional-indemnity insurance"
              helper="Do you hold cyber or professional-indemnity insurance? If so, name the insurer — they become an interested party."
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={value.has}
                  onCheckedChange={(checked) =>
                    field.onChange({
                      has: checked,
                      insurerName: checked ? value.insurerName : '',
                    })
                  }
                  aria-label="Has insurance"
                />
                <Text variant="muted">{value.has ? 'Yes, we hold insurance' : 'No insurance'}</Text>
              </div>
              {value.has && (
                <Input
                  value={value.insurerName}
                  onChange={(event) =>
                    field.onChange({ has: true, insurerName: event.target.value })
                  }
                  placeholder="Insurer name"
                  aria-label="Insurer name"
                />
              )}
            </WizardField>
          );
        }}
      />

      <Controller
        control={control}
        name="sectorRegulators"
        render={({ field }) => (
          <WizardField
            label="Sector regulators (via contract flow-down)"
            helper="Regulators your customers' contracts pass down to you. These drive your interested parties and requirements."
          >
            <WizardRegulatorSelect
              options={options}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          </WizardField>
        )}
      />
    </div>
  );
}
