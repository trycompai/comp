'use client';

import { Switch, Text } from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import { WizardCheckboxList } from './WizardCheckboxList';
import { WizardEditableList } from './WizardEditableList';
import { WizardField } from './WizardField';
import type { WizardDefaults, WizardFormValues } from './wizard-types';

interface WizardStepScopeProps {
  control: Control<WizardFormValues>;
  defaults: WizardDefaults;
}

/**
 * Step 3 — Workforce & scope.
 * Q6: contractors engaged alongside employees (yes/no).
 * Q7: customer-facing capabilities genuinely in production (tick-list).
 * Q8: cloud hosting scope split — customer vs provider responsibility.
 */
export function WizardStepScope({ control, defaults }: WizardStepScopeProps) {
  const capabilityOptions = Array.isArray(defaults?.capabilitiesInProduction)
    ? defaults.capabilitiesInProduction
    : [];

  return (
    <div className="flex flex-col gap-8">
      <Controller
        control={control}
        name="hasContractors"
        render={({ field }) => (
          <WizardField
            label="Contractors engaged alongside employees?"
            helper="If you use contractors, your workforce becomes a relevant interested party."
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={!!field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
                aria-label="Has contractors"
              />
              <Text variant="muted">
                {field.value ? 'Yes, we engage contractors' : 'No, employees only'}
              </Text>
            </div>
          </WizardField>
        )}
      />

      <Controller
        control={control}
        name="capabilitiesInProduction"
        render={({ field }) => (
          <WizardField
            label="Customer-facing capabilities in production"
            helper="Pre-filled from your services. Untick anything not genuinely live in production."
          >
            <WizardCheckboxList
              options={capabilityOptions}
              value={field.value ?? []}
              onChange={field.onChange}
              emptyText="No capabilities detected. Add them on the relevant document later."
            />
          </WizardField>
        )}
      />

      <Controller
        control={control}
        name="cloudScopeSplit"
        render={({ field }) => {
          const value = field.value ?? { customer: [], provider: [] };
          const customer = Array.isArray(value.customer) ? value.customer : [];
          const provider = Array.isArray(value.provider) ? value.provider : [];
          return (
            <WizardField
              label="Cloud hosting scope split"
              helper="What you are responsible for vs. what your hosting provider covers."
            >
              <div className="flex flex-col gap-6">
                <WizardEditableList
                  label="Your responsibility"
                  helper="Layers your organization manages (e.g. data, databases, application configuration)."
                  items={customer}
                  emptyText="No customer-managed layers yet."
                  onAdd={(item) =>
                    field.onChange({ customer: [...customer, item], provider })
                  }
                  onRemove={(index) =>
                    field.onChange({
                      customer: customer.filter((_, i) => i !== index),
                      provider,
                    })
                  }
                />
                <WizardEditableList
                  label="Provider responsibility"
                  helper="Layers your hosting provider manages (e.g. underlying infrastructure)."
                  items={provider}
                  emptyText="No provider-managed layers yet."
                  onAdd={(item) =>
                    field.onChange({ customer, provider: [...provider, item] })
                  }
                  onRemove={(index) =>
                    field.onChange({
                      customer,
                      provider: provider.filter((_, i) => i !== index),
                    })
                  }
                />
              </div>
            </WizardField>
          );
        }}
      />
    </div>
  );
}
