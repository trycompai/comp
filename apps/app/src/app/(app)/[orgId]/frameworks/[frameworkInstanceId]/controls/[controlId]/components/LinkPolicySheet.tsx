'use client';

import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Button,
  Checkbox,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Text,
} from '@trycompai/design-system';
import { Link as LinkIcon } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useControlOptions } from './useControlOptions';

export function LinkPolicySheet({
  controlId,
  alreadyLinkedPolicyIds,
}: {
  controlId: string;
  alreadyLinkedPolicyIds: string[];
}) {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { policies, isLoading } = useControlOptions(isOpen);
  const linked = useMemo(
    () => new Set(alreadyLinkedPolicyIds),
    [alreadyLinkedPolicyIds],
  );
  const options = useMemo(
    () => policies.filter((p) => !linked.has(p.id)),
    [policies, linked],
  );

  useEffect(() => {
    if (!isOpen) setSelected(new Set());
  }, [isOpen]);

  if (!hasPermission('control', 'update')) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.post(
        `/v1/controls/${controlId}/policies/link`,
        { policyIds: Array.from(selected) },
      );
      if (response.error) throw new Error(response.error);
      toast.success('Policies linked');
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to link policies',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        iconLeft={<LinkIcon size={16} />}
        onClick={() => setIsOpen(true)}
      >
        Link Policy
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Link Existing Policies</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {isLoading ? (
              <Text size="sm" variant="muted">
                Loading policies…
              </Text>
            ) : options.length === 0 ? (
              <Text size="sm" variant="muted">
                No additional policies available to link.
              </Text>
            ) : (
              <div className="space-y-2">
                {options.map((policy) => (
                  <label
                    key={policy.id}
                    className="flex items-start gap-3 rounded border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selected.has(policy.id)}
                      onCheckedChange={() => toggle(policy.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{policy.name}</div>
                    </div>
                  </label>
                ))}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={selected.size === 0 || isSubmitting}
                  >
                    Link {selected.size || ''} Polic
                    {selected.size === 1 ? 'y' : 'ies'}
                  </Button>
                </div>
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
