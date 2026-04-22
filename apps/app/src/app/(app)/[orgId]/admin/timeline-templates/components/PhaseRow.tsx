'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Button, Text } from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import { Input } from '@trycompai/ui/input';
import { Label } from '@trycompai/ui/label';
import { COMPLETION_OPTIONS, type CompletionType } from './constants';

interface PhaseFormValues {
  name: string;
  frameworkId: string;
  cycleNumber: number;
  phases: {
    id?: string;
    name: string;
    description?: string;
    defaultDurationWeeks: number;
    completionType: CompletionType;
    locksTimelineOnComplete?: boolean;
  }[];
}

interface PhaseRowProps {
  index: number;
  register: UseFormRegister<PhaseFormValues>;
  errors: FieldErrors<PhaseFormValues>;
  onRemove: () => void;
}

export function PhaseRow({ index, register, errors, onRemove }: PhaseRowProps) {
  const phaseErrors = errors.phases?.[index];

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between pb-2">
        <Text size="xs" variant="muted">
          Phase {index + 1}
        </Text>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          iconLeft={<TrashCan size={14} />}
          onClick={onRemove}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor={`phases.${index}.name`}>Name</Label>
          <Input
            id={`phases.${index}.name`}
            {...register(`phases.${index}.name`)}
            placeholder="Phase name"
          />
          {phaseErrors?.name && (
            <Text size="xs" variant="destructive">
              {phaseErrors.name.message}
            </Text>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`phases.${index}.defaultDurationWeeks`}>
            Duration (weeks)
          </Label>
          <Input
            id={`phases.${index}.defaultDurationWeeks`}
            type="number"
            min={1}
            {...register(`phases.${index}.defaultDurationWeeks`, {
              valueAsNumber: true,
            })}
          />
          {phaseErrors?.defaultDurationWeeks && (
            <Text size="xs" variant="destructive">
              {phaseErrors.defaultDurationWeeks.message}
            </Text>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`phases.${index}.completionType`}>
            Completion
          </Label>
          <select
            id={`phases.${index}.completionType`}
            {...register(`phases.${index}.completionType`)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {COMPLETION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <input
            id={`phases.${index}.locksTimelineOnComplete`}
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register(`phases.${index}.locksTimelineOnComplete`)}
          />
          <Label htmlFor={`phases.${index}.locksTimelineOnComplete`}>
            Lock timeline when this phase completes
          </Label>
        </div>
      </div>
    </div>
  );
}
