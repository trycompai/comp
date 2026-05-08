'use client';

import type { IntegrationProvider } from '@/hooks/use-integration-platform';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@trycompai/ui/sheet';
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
      <SheetContent side="right" style={{ maxWidth: 380 }} className="flex flex-col p-0">
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle className="text-sm font-semibold">Account Settings</SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{provider.name}</p>
        </SheetHeader>
        <SheetBody className="px-5">
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
