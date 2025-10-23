'use client';

import { FrameworkPill } from '@/components/framework-pill';
import type { FrameworkEditorFramework } from '@db';
import { useEffect, useRef, useState } from 'react';

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
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  // Keep refs up to date
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  useEffect(() => {
    async function fetchFrameworks() {
      try {
        onLoadingChange?.(true);
        const response = await fetch('/api/frameworks');
        if (!response.ok) throw new Error('Failed to fetch frameworks');
        const data = await response.json();
        setFrameworks(data.frameworks);
      } catch (error) {
        console.error('Error fetching frameworks:', error);
      } finally {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }

    fetchFrameworks();
  }, []); // Only run once on mount

  // Separate effect for auto-selection - only when frameworks first load
  useEffect(() => {
    if (frameworks.length > 0 && (!valueRef.current || valueRef.current.length === 0)) {
      const visibleFrameworks = frameworks.filter((f) => f.visible);
      if (visibleFrameworks.length > 0) {
        onChangeRef.current([visibleFrameworks[0].id]);
      }
    }
  }, [frameworks]); // Only depend on frameworks

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 overflow-y-auto pr-1">
      {frameworks
        .filter((framework) => framework.visible)
        .map((framework) => (
          <FrameworkPill
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
