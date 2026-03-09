'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Text } from '@trycompai/design-system';
import { Chat } from '@trycompai/design-system/icons';

export function ChatPlaceholder() {
  return (
    <div className="h-full">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Chat size={20} />
              AI Remediation Assistant
            </div>
          </CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[400px] items-center justify-center rounded-xs border-2 border-dashed">
            <div className="text-center">
              <div className="text-muted-foreground mx-auto mb-4 opacity-50">
                <Chat size={48} />
              </div>
              <Text size="sm" variant="muted">
                Chat with AI to automatically
                <br />
                remediate security findings
              </Text>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
