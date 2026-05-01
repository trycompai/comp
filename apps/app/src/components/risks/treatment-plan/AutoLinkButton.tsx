'use client';

import { Button } from '@trycompai/design-system';
import { Link as LinkIcon } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';

interface AutoLinkButtonProps {
  /** Whether the entity already has a saved treatment-plan description. */
  hasDescription: boolean;
  disabled?: boolean;
  onAutoLink: () => Promise<{ linked: number }>;
  onAfterLink?: () => Promise<void>;
}

export function AutoLinkButton({
  hasDescription,
  disabled,
  onAutoLink,
  onAfterLink,
}: AutoLinkButtonProps) {
  const [running, setRunning] = useState(false);

  const handleClick = async () => {
    setRunning(true);
    try {
      const { linked } = await onAutoLink();
      if (linked === 0) {
        toast.info('No matching tasks found. Link manually from the Tasks tab.');
      } else {
        toast.success(
          `Linked ${linked} task${linked === 1 ? '' : 's'}${
            hasDescription ? ' · refreshing treatment plan' : ' · generating treatment plan'
          }`,
        );
        if (onAfterLink) await onAfterLink();
      }
    } catch {
      toast.error('Auto-link failed. Try again or link manually.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || running}
      loading={running}
      iconLeft={<LinkIcon aria-hidden="true" />}
    >
      {hasDescription ? 'Auto-link tasks & refresh plan' : 'Auto-link tasks & generate plan'}
    </Button>
  );
}
