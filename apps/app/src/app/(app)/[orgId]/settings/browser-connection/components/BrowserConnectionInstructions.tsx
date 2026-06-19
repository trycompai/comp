'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@trycompai/design-system';

export function BrowserConnectionInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it works</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Create a service account</strong> - Use a
            dedicated account for browser automations when possible.
          </li>
          <li>
            <strong className="text-foreground">Authenticate per site</strong> - Each hostname gets
            its own auth profile and Browserbase context.
          </li>
          <li>
            <strong className="text-foreground">Complete 2FA manually</strong> - Live View supports
            manual approvals; Comp does not store passwords or TOTP secrets.
          </li>
          <li>
            <strong className="text-foreground">Reconnect when needed</strong> - Expired or blocked
            profiles are shown above and skipped by scheduled runs.
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
