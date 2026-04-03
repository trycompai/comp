'use client';

import { FrameworkPill } from '@/components/framework-pill';
import { useApi } from '@/hooks/use-api';
import type { FrameworkEditorFramework } from '@db';
import { useEffect, useRef } from 'react';
import useSWR from 'swr';

type Framework = Pick<FrameworkEditorFramework, 'id' | 'name' | 'description' | 'version' | 'visible'>;

interface FrameworkSelectionProps {
  value: string[];
  onChange: (value: string[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function FrameworkSelection({ value, onChange, onLoadingChange }: FrameworkSelectionProps) {
  const api = useApi();
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  const { data: frameworks = [], isLoading } = useSWR<Framework[]>(
    '/v1/frameworks/available',
    async (endpoint: string) => {
      const response = await api.get<{ data: Framework[] }>(endpoint);
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
  );

  // Keep refs up to date
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  // Notify parent of loading state
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // Auto-select first visible framework when frameworks load
  useEffect(() => {
    if (frameworks.length > 0 && (!valueRef.current || valueRef.current.length === 0)) {
      const visibleFrameworks = frameworks.filter((f) => f.visible);
      if (visibleFrameworks.length > 0) {
        onChangeRef.current([visibleFrameworks[0].id]);
      }
    }
  }, [frameworks]);

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
