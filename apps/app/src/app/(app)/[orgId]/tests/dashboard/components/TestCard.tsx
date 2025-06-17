'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import { Badge } from '@comp/ui/badge';
import { cn } from '@comp/ui/cn';
import { BadgeProps } from '@comp/ui/badge';
import { useState } from 'react';
import { Button } from '@comp/ui/button';
import { ArrowRight } from 'lucide-react';

const severityBadgeMap: {
  [key: string]: BadgeProps['variant'];
} = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'warning',
  low: 'default',
};

const severityBorderMap: {
  [key: string]: string;
} = {
  critical: 'border-t-destructive',
  high: 'border-t-destructive',
  medium: 'border-t-warning',
  low: 'border-t-primary',
};

export function TestCard({
  test,
}: {
  test: {
    id: string;
    title: string | null;
    description: string | null;
    remediation: string | null;
    status: string | null;
    severity: string | null;
    completedAt: Date | null;
    integration: {
      integrationId: string;
    };
  };
}) {
  const [showRemediation, setShowRemediation] = useState(false);

  if (showRemediation) {
    return (
      <Card
        key={test.id}
        className={cn(
          'flex flex-col border-t-4',
          severityBorderMap[test.severity?.toLocaleLowerCase() as keyof typeof severityBorderMap] ||
            'border-t-secondary',
        )}
      >
        <CardHeader>
          <CardTitle>Remediation</CardTitle>
        </CardHeader>
        <CardContent className="text-md break-before-auto break-all">
          {test.remediation?.split(/\b(https?:\/\/\S+)\b/).map((part, i) => {
            return /^https?:\/\/\S+$/.test(part) ? (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all underline"
              >
                {part}
              </a>
            ) : (
              <span key={i} className="break-all">
                {part}
              </span>
            );
          })}
        </CardContent>
        <CardFooter className="flex justify-end py-4">
          <Button size="sm" variant="outline" onClick={() => setShowRemediation(false)}>
            Close
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      key={test.id}
      className={cn(
        'flex flex-col border-t-4 break-all',
        severityBorderMap[test.severity?.toLocaleLowerCase() as keyof typeof severityBorderMap] ||
          'border-t-secondary',
      )}
    >
      <CardHeader className="relative flex flex-col gap-2 break-all">
        <div className="flex flex-row items-center justify-between">
          <div className="text-muted-foreground text-xs">
            Last Checked: {test.completedAt?.toLocaleString()}
          </div>
          {test.severity && (
            <Badge
              className="select-none"
              variant={
                (severityBadgeMap[test.severity.toLowerCase() as keyof typeof severityBadgeMap] ||
                  'default') as BadgeProps['variant']
              }
            >
              {test.severity}
            </Badge>
          )}
        </div>
        <CardTitle>{test.title || 'Untitled Test'}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground flex h-full flex-col gap-3 text-sm">
        {test.description && <p>{test.description}</p>}
        <span className="flex-grow" />
      </CardContent>
      <CardFooter className="flex items-center justify-between py-4">
        <div className="text-muted-foreground text-xs">Status: {test.status}</div>
        <Button size="sm" variant="outline" onClick={() => setShowRemediation(true)}>
          Remediate <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
