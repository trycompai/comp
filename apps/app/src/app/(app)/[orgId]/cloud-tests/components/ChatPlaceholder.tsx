'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { MessageSquare } from 'lucide-react';

export function ChatPlaceholder() {
  return (
    <Card className="h-full rounded-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Remediation Assistant
        </CardTitle>
        <CardDescription>Coming soon</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 flex h-[400px] items-center justify-center rounded-xs border-2 border-dashed">
          <div className="text-muted-foreground text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="text-sm">
              Chat with AI to automatically
              <br />
              remediate security findings
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
