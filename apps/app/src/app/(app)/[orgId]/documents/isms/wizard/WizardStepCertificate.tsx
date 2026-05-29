'use client';

import { Badge, Text, Textarea } from '@trycompai/design-system';
import { Certificate } from '@trycompai/design-system/icons';
import { Controller, type Control } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import type { WizardFormValues } from './wizard-types';

interface WizardStepCertificateProps {
  control: Control<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
}

/**
 * Step 5 — Certificate scope.
 * Q10: confirm/edit the generated certificate scope sentence. Emphasised because
 * it appears verbatim on the public ISO 27001 certificate.
 */
export function WizardStepCertificate({ control, errors }: WizardStepCertificateProps) {
  return (
    <section className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Certificate size={20} />
        <Text size="base" weight="semibold">
          Certificate scope statement
        </Text>
        <Badge variant="secondary">Appears on your certificate</Badge>
      </div>
      <div className="text-muted-foreground">
        <Text variant="muted">
          This single sentence is printed verbatim on your public ISO 27001 certificate. We have
          drafted it from your platform data — review it carefully and edit until it is precise.
        </Text>
      </div>
      <Controller
        control={control}
        name="certificateScopeSentence"
        render={({ field: { ref: _ref, ...field } }) => (
          <Textarea
            {...field}
            rows={4}
            placeholder="The provision of … by … operating from …"
            aria-label="Certificate scope sentence"
          />
        )}
      />
      {errors.certificateScopeSentence && (
        <span className="text-xs text-destructive">
          {errors.certificateScopeSentence.message}
        </span>
      )}
    </section>
  );
}
