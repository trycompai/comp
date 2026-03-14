'use client';

import { api } from '@/lib/api-client';
import { PolicyEditor } from '@/components/editor/policy-editor';
import {
  Badge,
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Renew } from '@trycompai/design-system/icons';
import type { JSONContent } from '@tiptap/react';
import { useState } from 'react';

interface PolicyWithContent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  content: unknown[];
  draftContent?: unknown[];
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  published: 'default',
  needs_review: 'secondary',
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PolicyContentSheet({
  policy,
  orgId,
  onClose,
  onRegenerated,
}: {
  policy: PolicyWithContent | null;
  orgId: string;
  onClose: () => void;
  onRegenerated: () => void;
}) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!policy) return;
    setRegenerating(true);
    await api.post(
      `/v1/admin/organizations/${orgId}/policies/${policy.id}/regenerate`,
    );
    setRegenerating(false);
    onRegenerated();
  };

  const content = (policy?.content ?? policy?.draftContent ?? []) as JSONContent[];

  return (
    <Sheet open={!!policy} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{policy?.name ?? 'Policy'}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {policy && (
            <Stack gap="md">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[policy.status] ?? 'default'}>
                  {formatLabel(policy.status)}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  iconLeft={<Renew size={16} />}
                  onClick={() => void handleRegenerate()}
                  loading={regenerating}
                  disabled={regenerating}
                >
                  Regenerate
                </Button>
              </div>
              {policy.description && (
                <Text size="sm" variant="muted">
                  {policy.description}
                </Text>
              )}
              <div className="border-t pt-4">
                {content.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No content generated yet.
                  </div>
                ) : (
                  <PolicyEditor content={content} readOnly />
                )}
              </div>
            </Stack>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
