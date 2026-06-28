'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trycompai/design-system';
import { Renew } from '@trycompai/design-system/icons';

export function BrowserConnectionLiveView({
  liveViewUrl,
  isChecking,
  canManageBrowser,
  onCheckAuth,
  onClose,
}: {
  liveViewUrl: string;
  isChecking: boolean;
  canManageBrowser: boolean;
  onCheckAuth: () => void;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Browser Session</CardTitle>
            <CardDescription>
              Log in to websites below. Your session will be saved for automations.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCheckAuth}
              disabled={isChecking || !canManageBrowser}
              loading={isChecking}
              iconLeft={!isChecking ? <Renew size={14} /> : undefined}
            >
              {isChecking ? 'Checking...' : 'Check & Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <iframe
            src={liveViewUrl}
            className="h-[600px] w-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </CardContent>
    </Card>
  );
}
