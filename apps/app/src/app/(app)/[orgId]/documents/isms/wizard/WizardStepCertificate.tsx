'use client';

import {
  Badge,
  Field,
  FieldError,
  HStack,
  Heading,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
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
 * Q10: confirm/edit the generated certificate scope sentence. Emphasised with a
 * highlighted panel because it is printed verbatim on the public ISO 27001
 * certificate.
 */
export function WizardStepCertificate({ control, errors }: WizardStepCertificateProps) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
      <Stack gap="4">
        <Stack gap="2">
          <HStack gap="2" align="center" wrap="wrap">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Certificate size={20} />
            </div>
            <Heading level="3">Certificate scope statement</Heading>
            <Badge variant="accent">Appears on your certificate</Badge>
          </HStack>
          <Text size="sm" variant="muted">
            This single sentence is printed verbatim on your public ISO 27001 certificate. We have
            drafted it from your platform data — review it carefully and edit until it is precise.
          </Text>
        </Stack>

        <Controller
          control={control}
          name="certificateScopeSentence"
          render={({ field: { ref: _ref, ...field } }) => (
            <Field>
              <Textarea
                {...field}
                rows={4}
                placeholder="The provision of … by … operating from …"
                aria-label="Certificate scope sentence"
              />
              {errors.certificateScopeSentence && (
                <FieldError>{errors.certificateScopeSentence.message}</FieldError>
              )}
            </Field>
          )}
        />
      </Stack>
    </div>
  );
}
