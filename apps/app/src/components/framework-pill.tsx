'use client';

import type { FrameworkEditorFramework } from '@db';
import { SelectablePill } from './selectable-pill';

type FrameworkPillProps = {
  framework: Pick<FrameworkEditorFramework, 'id' | 'name' | 'version'>;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
  className?: string;
};

export function FrameworkPill({
  framework,
  isSelected,
  onSelectionChange,
  className,
}: FrameworkPillProps) {
  return (
    <SelectablePill
      label={`${framework.name}`}
      isSelected={isSelected}
      onSelectionChange={onSelectionChange}
      className={className}
    />
  );
}
