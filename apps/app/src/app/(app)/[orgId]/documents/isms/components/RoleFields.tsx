'use client';

import { Field, FieldError, Input, Stack, Textarea } from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import type { RoleFormValues } from './role-schema';
import { IsmsFieldLabel } from './shared';

interface RoleFieldsProps {
  control: Control<RoleFormValues>;
  /** Seeded roles keep their name fixed; custom roles let the user set it. */
  showName: boolean;
}

/**
 * The labelled editors for a role's text fields (clause 5.3), shared by the
 * add-custom-role form and the inline edit row. DS primitives only.
 */
export function RoleFields({ control, showName }: RoleFieldsProps) {
  return (
    <Stack gap="3">
      {showName ? (
        <IsmsFieldLabel label="Role name">
          <Field>
            <Controller
              control={control}
              name="name"
              render={({ field: { ref: _ref, ...field }, fieldState }) => (
                <>
                  <Input {...field} placeholder="Role name" aria-label="Role name" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </>
              )}
            />
          </Field>
        </IsmsFieldLabel>
      ) : null}
      <IsmsFieldLabel label="Description">
        <Field>
          <Controller
            control={control}
            name="description"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} aria-label="Role description" />
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Responsibilities">
        <Field>
          <Controller
            control={control}
            name="responsibilities"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={3} aria-label="Role responsibilities" />
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Authorities">
        <Field>
          <Controller
            control={control}
            name="authorities"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} aria-label="Role authorities" />
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Authority granted by">
        <Field>
          <Controller
            control={control}
            name="authorityGrantedBy"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} aria-label="Authority granted by" />
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Required competence">
        <Field>
          <Controller
            control={control}
            name="requiredCompetence"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea {...field} rows={2} aria-label="Required competence" />
            )}
          />
        </Field>
      </IsmsFieldLabel>
    </Stack>
  );
}
