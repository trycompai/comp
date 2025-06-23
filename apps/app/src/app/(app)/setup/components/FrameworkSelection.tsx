'use client';

import { FrameworkCard } from '@/components/framework-card';
import type { FrameworkEditorFramework } from '@comp/db/types';
import { useEffect, useState } from 'react';

interface FrameworkSelectionProps {
  value: string[];
  onChange: (value: string[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function FrameworkSelection({ value, onChange, onLoadingChange }: FrameworkSelectionProps) {
  const [frameworks, setFrameworks] = useState<
    Pick<FrameworkEditorFramework, 'id' | 'name' | 'description' | 'version' | 'visible'>[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFrameworks() {
      try {
        onLoadingChange?.(true);
        const response = await fetch('/api/frameworks');
        if (!response.ok) throw new Error('Failed to fetch frameworks');
        const data = await response.json();
        setFrameworks(data.frameworks);

        // Auto-select the first visible framework if none selected
        const visibleFrameworks = data.frameworks.filter((f: any) => f.visible);
        if (visibleFrameworks.length > 0 && (!value || value.length === 0)) {
          onChange([visibleFrameworks[0].id]);
        }
      } catch (error) {
        console.error('Error fetching frameworks:', error);
      } finally {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }

    fetchFrameworks();
  }, [onLoadingChange]); // Removed onChange and value from dependencies to prevent infinite loop

  if (isLoading) {
    return null;
  }

  return (
    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
      {frameworks
        .filter((framework) => framework.visible)
        .map((framework) => (
          <FrameworkCard
            key={framework.id}
            framework={framework}
            isSelected={value.includes(framework.id)}
            onSelectionChange={(checked) => {
              onChange(
                checked ? [...value, framework.id] : value.filter((id) => id !== framework.id),
              );
            }}
          />
        ))}
    </div>
  );
}
