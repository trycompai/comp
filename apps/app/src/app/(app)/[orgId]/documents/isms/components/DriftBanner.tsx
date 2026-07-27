'use client';

import { Alert, AlertDescription, AlertTitle, Button, Text } from '@trycompai/design-system';
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
    <Alert variant="warning" icon={<WarningAlt />}>
      <AlertTitle>Out of date</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-3">
          <div>
            The platform data behind this document has changed since it was last generated.
            {changedSources.length > 0 && (
              <>
                {' '}
                Changed sources:{' '}
                <Text as="span" size="sm" weight="medium">
                  {changedSources.join(', ')}
                </Text>
                .
              </>
            )}
          </div>
          {canRegenerate && (
            <div className="flex">
              <Button
                type="button"
                size="sm"
                variant="outline"
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
