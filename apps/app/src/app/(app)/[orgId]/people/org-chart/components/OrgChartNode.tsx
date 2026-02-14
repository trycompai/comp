'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface OrgChartNodeData {
  name: string;
  title?: string;
  memberId?: string;
  isLocked?: boolean;
  onTitleChange?: (newTitle: string) => void;
  [key: string]: unknown;
}

export function OrgChartNode({
  data,
  selected,
}: NodeProps & { data: OrgChartNodeData }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editValue, setEditValue] = useState(data.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const isLocked = data.isLocked ?? true;

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // Keep editValue in sync with data.title when not editing
  useEffect(() => {
    if (!isEditingTitle) {
      setEditValue(data.title || '');
    }
  }, [data.title, isEditingTitle]);

  const commitTitle = useCallback(() => {
    setIsEditingTitle(false);
    const trimmed = editValue.trim();
    if (trimmed !== (data.title || '') && data.onTitleChange) {
      data.onTitleChange(trimmed);
    }
  }, [editValue, data]);

  const initials = data.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`rounded-lg border bg-background px-4 py-3 shadow-sm transition-shadow min-w-[180px] ${
        selected ? 'border-primary ring-primary/20 ring-2' : 'border-border'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="bg-primary! border-background! h-2! w-2!"
      />
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {initials}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-medium text-foreground">
            {data.name}
          </span>
          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setEditValue(data.title || '');
                  setIsEditingTitle(false);
                }
              }}
              className="w-full rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
              placeholder="e.g. Engineering Manager"
            />
          ) : data.title ? (
            <span
              className={`truncate text-xs text-muted-foreground ${
                !isLocked ? 'cursor-text hover:text-foreground' : ''
              }`}
              onClick={(e) => {
                if (!isLocked) {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }
              }}
              title={!isLocked ? 'Click to edit job title' : undefined}
            >
              {data.title}
            </span>
          ) : (
            <span
              className={`truncate text-xs ${
                !isLocked
                  ? 'cursor-text italic text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300'
                  : 'italic text-amber-500/70 dark:text-amber-400/70'
              }`}
              onClick={(e) => {
                if (!isLocked) {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }
              }}
              title={!isLocked ? 'Click to add job title' : 'No job title set'}
            >
              {!isLocked ? '+ Add job title' : 'No title'}
            </span>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-primary! border-background! h-2! w-2!"
      />
    </div>
  );
}
