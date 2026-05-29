'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Text,
} from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import { WizardField } from './WizardField';
import {
  INTERNAL_AUDIT_APPROACHES,
  INTERNAL_AUDIT_LABELS,
  type WizardFormValues,
  type WizardMemberOption,
} from './wizard-types';

interface WizardStepLeadershipProps {
  control: Control<WizardFormValues>;
  members: WizardMemberOption[];
}

const TO_BE_NAMED = '__to_be_named__';

/**
 * Step 1 — Leadership & accountability.
 * Q1: Deputy Security & Privacy Owner (member picker or "to be named").
 * Q2: Internal audit approach (in-house / external firm / training planned).
 */
export function WizardStepLeadership({ control, members }: WizardStepLeadershipProps) {
  const memberOptions = Array.isArray(members) ? members : [];

  return (
    <div className="flex flex-col gap-8">
      <Controller
        control={control}
        name="deputySpo"
        render={({ field }) => {
          const value = field.value ?? { memberId: null, toBeNamed: false };
          const selectValue = value.toBeNamed
            ? TO_BE_NAMED
            : value.memberId ?? undefined;

          return (
            <WizardField
              label="Deputy Security & Privacy Owner"
              helper="The backup owner for security and privacy decisions. Pick a person, or mark it to be named later."
            >
              <Select
                value={selectValue}
                onValueChange={(next) => {
                  if (next === TO_BE_NAMED) {
                    field.onChange({ memberId: null, toBeNamed: true });
                    return;
                  }
                  field.onChange({ memberId: next, toBeNamed: false });
                }}
              >
                <SelectTrigger aria-label="Deputy Security and Privacy Owner">
                  <SelectValue placeholder="Select a deputy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TO_BE_NAMED}>To be named</SelectItem>
                  {memberOptions.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  checked={value.toBeNamed}
                  onCheckedChange={(checked) =>
                    field.onChange({
                      memberId: checked ? null : value.memberId,
                      toBeNamed: checked,
                    })
                  }
                  aria-label="Deputy to be named"
                />
                <Text variant="muted">To be named later</Text>
              </div>
            </WizardField>
          );
        }}
      />

      <Controller
        control={control}
        name="internalAuditApproach"
        render={({ field }) => (
          <WizardField
            label="Internal audit approach"
            helper="How you will run the internal ISMS audits required for certification."
          >
            <Select
              value={field.value ?? undefined}
              onValueChange={(next) => field.onChange(next)}
            >
              <SelectTrigger aria-label="Internal audit approach">
                <SelectValue placeholder="Select an approach" />
              </SelectTrigger>
              <SelectContent>
                {INTERNAL_AUDIT_APPROACHES.map((approach) => (
                  <SelectItem key={approach} value={approach}>
                    {INTERNAL_AUDIT_LABELS[approach]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>
        )}
      />
    </div>
  );
}
