'use client';

import type { IntegrationProvider } from '@/hooks/use-integration-platform';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@trycompai/design-system';
import { AccountSettingsOAuthBody } from './account-settings-oauth';
import { AwsAccountSettingsBody } from './aws-account-settings-body';

interface AccountSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  provider: IntegrationProvider;
  orgId: string;
  onUpdated?: () => void;
}

export function AccountSettingsSheet({
  open,
  onOpenChange,
  connectionId,
  provider,
  orgId,
  onUpdated,
}: AccountSettingsSheetProps) {
  const isAws = provider.id === 'aws';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" style={{ maxWidth: 380 }}>
        <SheetHeader>
          <SheetTitle>Account Settings</SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{provider.name}</p>
        </SheetHeader>
        <SheetBody>
          {isAws ? (
            <AwsAccountSettingsBody
              open={open}
              connectionId={connectionId}
              provider={provider}
              orgId={orgId}
              onUpdated={onUpdated}
            />
          ) : (
            <AccountSettingsOAuthBody
              open={open}
              connectionId={connectionId}
              provider={provider}
              onUpdated={onUpdated}
              onOpenChange={onOpenChange}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
