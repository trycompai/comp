'use client';

import { api } from '@/lib/api-client';
import {
  Button,
  HStack,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface EditableFinding {
  id: string;
  content: string;
  severity: string;
  status: string;
}

const STATUS_OPTIONS = ['open', 'ready_for_review', 'needs_revision', 'closed'];
const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EditFindingSheetProps<TFinding extends EditableFinding> {
  orgId: string;
  finding: TFinding | null;
  /** Label describing what the finding is logged against. */
  targetLabel: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: TFinding) => void;
}

export function EditFindingSheet<TFinding extends EditableFinding>({
  orgId,
  finding,
  targetLabel,
  onOpenChange,
  onSaved,
}: EditFindingSheetProps<TFinding>) {
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState<string>('medium');
  const [status, setStatus] = useState<string>('open');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (finding) {
      setContent(finding.content);
      setSeverity(finding.severity);
      setStatus(finding.status);
    }
  }, [finding]);

  if (!finding) return null;

  const isDirty =
    content !== finding.content ||
    severity !== finding.severity ||
    status !== finding.status;

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, string> = {};
    if (content !== finding.content) payload.content = content;
    if (severity !== finding.severity) payload.severity = severity;
    if (status !== finding.status) payload.status = status;

    const res = await api.patch<Partial<TFinding>>(
      `/v1/admin/organizations/${orgId}/findings/${finding.id}`,
      payload,
    );
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Finding updated');
      onSaved({ ...finding, ...(res.data ?? {}), content, severity, status });
    }
    setSaving(false);
  };

  return (
    <Sheet open={finding !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit finding</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Stack gap="lg">
            <Stack gap="xs">
              <Text size="sm" weight="medium">
                Target
              </Text>
              <Text size="sm" variant="muted">
                {targetLabel}
              </Text>
            </Stack>

            <Stack gap="xs">
              <label htmlFor="finding-content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="finding-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                disabled={saving}
              />
            </Stack>

            <HStack gap="sm">
              <div className="flex-1">
                <Stack gap="xs">
                  <label className="text-sm font-medium">Severity</label>
                  <Select
                    value={severity}
                    onValueChange={(v) => v && setSeverity(v)}
                    disabled={saving}
                  >
                    <SelectTrigger>{capitalize(severity)}</SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {capitalize(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Stack>
              </div>
              <div className="flex-1">
                <Stack gap="xs">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={status}
                    onValueChange={(v) => v && setStatus(v)}
                    disabled={saving}
                  >
                    <SelectTrigger>{formatStatus(status)}</SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatStatus(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Stack>
              </div>
            </HStack>

            <HStack justify="end" gap="xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                loading={saving}
                disabled={!isDirty || saving || !content.trim()}
              >
                Save
              </Button>
            </HStack>
          </Stack>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
