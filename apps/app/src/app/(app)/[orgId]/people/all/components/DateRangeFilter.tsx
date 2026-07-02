'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@trycompai/design-system';
import { Calendar as CalendarIcon, ChevronDown } from '@trycompai/design-system/icons';

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This quarter', days: 90 },
  { label: 'This year', days: 365 },
  { label: 'All time', days: 0 },
] as const;

function getPresetRange(days: number): { from: Date | undefined; to: Date | undefined } {
  if (days === 0) return { from: undefined, to: undefined };
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function getActivePresetLabel(from: Date | undefined, to: Date | undefined): string | null {
  if (!from && !to) return 'Any time';
  if (!from || !to) return null;
  const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  const now = new Date();
  const isToToday = Math.abs(to.getTime() - now.getTime()) < 1000 * 60 * 60 * 24;
  if (!isToToday) return null;
  for (const p of PRESETS) {
    if (p.days === 0) continue;
    if (Math.abs(diffDays - p.days) <= 1) return p.label;
  }
  return null;
}

export function DateRangeFilter({
  label,
  from,
  to,
  onApply,
  onClear,
}: {
  label: string;
  from: Date | undefined;
  to: Date | undefined;
  onApply: (from: Date | undefined, to: Date | undefined) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(from);
  const [draftTo, setDraftTo] = useState<Date | undefined>(to);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDraftFrom(from);
      setDraftTo(to);
      setActivePreset(getActivePresetLabel(from, to));
    }
    setOpen(isOpen);
  };

  const handlePreset = (days: number, presetLabel: string) => {
    const range = getPresetRange(days);
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setActivePreset(presetLabel);
  };

  const handleApply = () => {
    onApply(draftFrom, draftTo);
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
    setOpen(false);
  };

  const displayLabel = from && to
    ? `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`
    : from
      ? `From ${format(from, 'MMM d, yyyy')}`
      : to
        ? `Until ${format(to, 'MMM d, yyyy')}`
        : 'Any time';

  const labelId = `people-${label.toLowerCase()}-filter-label`;

  return (
    <div className="flex flex-col gap-1">
      <span id={labelId} className="text-xs text-muted-foreground">
        {label}
      </span>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger aria-labelledby={labelId}>
          <div className="border-border bg-background hover:bg-muted flex h-8 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-xs transition-colors cursor-pointer">
            <CalendarIcon size={13} className="text-muted-foreground" />
            <span className="font-medium">{displayLabel}</span>
            <ChevronDown size={12} className="text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" style={{ width: 'auto' }}>
          <div className="flex w-[380px] flex-col gap-4 p-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {label} between
            </span>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p.days, p.label)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    activePreset === p.label
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
                <PopoverTrigger>
                  <div className="border-border bg-muted/50 flex h-10 flex-1 items-center gap-2 rounded-lg border px-3 text-sm cursor-pointer">
                    <CalendarIcon size={14} className="text-muted-foreground" />
                    {draftFrom ? format(draftFrom, 'MMM d, yyyy') : <span className="text-muted-foreground">Start date</span>}
                  </div>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <Calendar
                    mode="single"
                    selected={draftFrom}
                    onSelect={(d) => { setDraftFrom(d ?? undefined); setActivePreset(null); setFromPickerOpen(false); }}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 1}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
                <PopoverTrigger>
                  <div className="border-border bg-muted/50 flex h-10 flex-1 items-center gap-2 rounded-lg border px-3 text-sm cursor-pointer">
                    <CalendarIcon size={14} className="text-muted-foreground" />
                    {draftTo ? format(draftTo, 'MMM d, yyyy') : <span className="text-muted-foreground">End date</span>}
                  </div>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <Calendar
                    mode="single"
                    selected={draftTo}
                    onSelect={(d) => { setDraftTo(d ?? undefined); setActivePreset(null); setToPickerOpen(false); }}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 1}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <div>
                <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
              </div>
              <div>
                <Button size="sm" onClick={handleApply}>Apply</Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
