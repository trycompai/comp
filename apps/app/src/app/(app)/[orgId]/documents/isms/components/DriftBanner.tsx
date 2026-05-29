'use client';

import { Alert, AlertDescription, AlertTitle, Button } from '@trycompai/design-system';
import { Renew, WarningAlt } from '@trycompai/design-system/icons';

interface DriftBannerProps {
  changedSources: string[];
  canRegenerate: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

export function DriftBanner({
  changedSources,
  canRegenerate,
  isRegenerating,
  onRegenerate,
}: DriftBannerProps) {
  return (
    <Alert variant="default" icon={<WarningAlt />}>
      <AlertTitle>Out of date</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-2">
          <div>
            The platform data behind this document has changed since it was last generated.
            {changedSources.length > 0 && (
              <span>
                {' '}
                Changed sources: <span className="font-semibold">{changedSources.join(', ')}</span>.
              </span>
            )}
          </div>
          {canRegenerate && (
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                loading={isRegenerating}
                iconLeft={<Renew size={16} />}
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
