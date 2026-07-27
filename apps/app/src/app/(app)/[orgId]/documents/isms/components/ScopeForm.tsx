'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Badge, Button, Label, Text, Textarea } from '@trycompai/design-system';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { IsmsScopeNarrative } from '../isms-types';
import { ScopeStringList } from './ScopeStringList';

const scopeNarrativeSchema = z.object({
  certificateScopeSentence: z.string().min(1, 'Certificate scope sentence is required'),
  inScope: z.string().min(1, 'In-scope description is required'),
  interfaces: z.array(z.string().min(1)),
  dependencies: z.array(z.string().min(1)),
  exclusions: z.array(z.string().min(1)),
  justification: z.string().optional(),
});

export type ScopeNarrativeValues = z.infer<typeof scopeNarrativeSchema>;

interface ScopeFormProps {
  narrative: IsmsScopeNarrative;
  canEdit: boolean;
  onSave: (values: ScopeNarrativeValues) => Promise<void>;
}

function toDefaults(narrative: IsmsScopeNarrative): ScopeNarrativeValues {
  return {
    certificateScopeSentence: narrative.certificateScopeSentence ?? '',
    inScope: narrative.inScope ?? '',
    interfaces: Array.isArray(narrative.interfaces) ? narrative.interfaces : [],
    dependencies: Array.isArray(narrative.dependencies) ? narrative.dependencies : [],
    exclusions: Array.isArray(narrative.exclusions) ? narrative.exclusions : [],
    justification: narrative.justification ?? '',
  };
}

export function ScopeForm({ narrative, canEdit, onSave }: ScopeFormProps) {
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<ScopeNarrativeValues>({
    resolver: zodResolver(scopeNarrativeSchema),
    defaultValues: toDefaults(narrative),
  });

  const interfaces = watch('interfaces');
  const dependencies = watch('dependencies');
  const exclusions = watch('exclusions');

  const handleSave = handleSubmit(async (values) => {
    await onSave(values);
  });

  const handleAddItem = ({
    field,
    value,
  }: {
    field: 'interfaces' | 'dependencies' | 'exclusions';
    value: string;
  }) => {
    const current = getValues(field) ?? [];
    setValue(field, [...current, value], { shouldDirty: true });
  };

  const handleRemoveItem = ({
    field,
    index,
  }: {
    field: 'interfaces' | 'dependencies' | 'exclusions';
    index: number;
  }) => {
    const current = getValues(field) ?? [];
    setValue(
      field,
      current.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-8">
      {/* Customer-approved certificate scope — rendered prominently at the top. */}
      <section className="flex flex-col gap-2 rounded-md border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Text size="base" weight="semibold">
            Certificate scope statement
          </Text>
          <Badge variant="secondary">Customer-approved</Badge>
        </div>
        <div className="text-muted-foreground">
          <Text variant="muted">
            The single sentence that appears on your ISO 27001 certificate. Keep it precise — it
            defines the boundary of certification.
          </Text>
        </div>
        {canEdit ? (
          <div className="flex flex-col gap-1">
            <Controller
              control={control}
              name="certificateScopeSentence"
              render={({ field: { ref: _ref, ...field } }) => (
                <Textarea
                  {...field}
                  rows={3}
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
          </div>
        ) : (
          <p className="text-base font-medium">{narrative.certificateScopeSentence}</p>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Label htmlFor="scope-in-scope">In scope</Label>
        <div className="text-muted-foreground">
          <Text variant="muted">
            Products, services, locations, and organizational units the ISMS covers.
          </Text>
        </div>
        {canEdit ? (
          <div className="flex flex-col gap-1">
            <Controller
              control={control}
              name="inScope"
              render={({ field: { ref: _ref, ...field } }) => (
                <Textarea
                  {...field}
                  id="scope-in-scope"
                  rows={4}
                  placeholder="Describe what the ISMS applies to"
                  aria-label="In scope"
                />
              )}
            />
            {errors.inScope && (
              <span className="text-xs text-destructive">{errors.inScope.message}</span>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{narrative.inScope}</p>
        )}
      </div>

      <ScopeStringList
        label="Interfaces"
        helper="Points where the ISMS meets external parties, systems, or processes."
        items={interfaces}
        canEdit={canEdit}
        emptyText="No interfaces recorded yet."
        onAdd={(value) => handleAddItem({ field: 'interfaces', value })}
        onRemove={(index) => handleRemoveItem({ field: 'interfaces', index })}
      />

      <ScopeStringList
        label="Dependencies"
        helper="External services, suppliers, or systems the ISMS relies on."
        items={dependencies}
        canEdit={canEdit}
        emptyText="No dependencies recorded yet."
        onAdd={(value) => handleAddItem({ field: 'dependencies', value })}
        onRemove={(index) => handleRemoveItem({ field: 'dependencies', index })}
      />

      <ScopeStringList
        label="Exclusions"
        helper="Anything explicitly outside the ISMS boundary."
        items={exclusions}
        canEdit={canEdit}
        emptyText="No exclusions recorded yet."
        onAdd={(value) => handleAddItem({ field: 'exclusions', value })}
        onRemove={(index) => handleRemoveItem({ field: 'exclusions', index })}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="scope-justification">Justification for exclusions (optional)</Label>
        <div className="text-muted-foreground">
          <Text variant="muted">
            Explain why anything was excluded and how that does not undermine the ISMS.
          </Text>
        </div>
        {canEdit ? (
          <Controller
            control={control}
            name="justification"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                id="scope-justification"
                rows={3}
                placeholder="Optional justification for the exclusions above"
                aria-label="Justification"
              />
            )}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{narrative.justification || '—'}</p>
        )}
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving...' : 'Save scope'}
          </Button>
        </div>
      )}
    </form>
  );
}
