'use client';

import { apiClient } from '@/app/lib/api-client';
import { Button } from '@trycompai/ui/button';
import { Checkbox } from '@trycompai/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/ui/select';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { FrameworkFamilyWithCount, FrameworkWithCounts } from '../FrameworksClientPage';

// Sentinel for "move to the root" (Select can't hold a null value).
const ROOT_VALUE = '__root__';

interface MoveFrameworkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  frameworks: FrameworkWithCounts[];
  families: FrameworkFamilyWithCount[];
}

export function MoveFrameworkDialog({
  isOpen,
  onOpenChange,
  frameworks,
  families,
}: MoveFrameworkDialogProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState<string>(ROOT_VALUE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set());
      setDestination(ROOT_VALUE);
    }
  }, [isOpen]);

  const familyNameById = useMemo(
    () => new Map(families.map((f) => [f.id, f.name])),
    [families],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function handleMove() {
    if (selected.size === 0) {
      toast.error('Select at least one framework to move.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient('/framework-family/move', {
        method: 'POST',
        body: JSON.stringify({
          frameworkIds: [...selected],
          familyId: destination === ROOT_VALUE ? null : destination,
        }),
      });
      toast.success(`Moved ${selected.size} framework(s).`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move frameworks.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Framework</DialogTitle>
          <DialogDescription>
            Pick the frameworks to move, then choose the destination family.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="mb-2 text-sm font-medium">Frameworks</p>
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {frameworks.length === 0 ? (
                <p className="text-muted-foreground p-3 text-sm">No frameworks yet.</p>
              ) : (
                frameworks.map((fw) => (
                  <label
                    key={fw.id}
                    className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 border-b px-3 py-2 last:border-0"
                  >
                    <Checkbox
                      checked={selected.has(fw.id)}
                      onCheckedChange={() => toggle(fw.id)}
                    />
                    <span className="text-sm">{fw.name}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {fw.familyId ? (familyNameById.get(fw.familyId) ?? 'Unknown') : '/'}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Destination family</p>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_VALUE}>/ (Root)</SelectItem>
                {families.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isSubmitting || selected.size === 0}>
            {isSubmitting ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
