'use client';

import { Button, Spinner } from '@trycompai/design-system';
import { Play, Renew, Screen } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { LiveActivityBorder } from './LiveActivityBorder';

interface BrowserLiveViewProps {
  title: string;
  subtitle: string;
  liveViewUrl: string;
  variant: 'auth' | 'execution';
  isChecking?: boolean;
  onSave?: () => void;
  onCancel: () => void;
}

export function BrowserLiveView({
  title,
  subtitle,
  liveViewUrl,
  variant,
  isChecking,
  onSave,
  onCancel,
}: BrowserLiveViewProps) {
  const Icon = variant === 'auth' ? Screen : Play;
  const iconClass = variant === 'execution' ? 'text-primary animate-pulse' : 'text-primary';
  const bgClass = variant === 'execution' ? 'bg-primary/10' : 'bg-muted';

  // Gate the ring on the iframe's load so it appears with the page, not before.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [liveViewUrl]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${bgClass}`}>
              <Icon className={`h-4 w-4 ${iconClass}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {variant === 'execution' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner />
                Executing...
              </div>
            )}
            {variant === 'auth' && onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                disabled={isChecking}
                loading={isChecking}
                iconLeft={!isChecking ? <Renew size={12} /> : undefined}
              >
                {isChecking ? 'Checking...' : 'Check & Save'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="relative overflow-hidden rounded-lg border">
          <iframe
            src={liveViewUrl}
            className="block h-[500px] w-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="clipboard-read; clipboard-write"
            onLoad={() => setLoaded(true)}
          />
          {/* Show once the browser has rendered so it fades in with the page.
              AI glow while it runs; amber "Your turn" pill on manual auth. */}
          {loaded && (
            <LiveActivityBorder state={variant === 'execution' ? 'ai' : 'you'} />
          )}
        </div>
      </div>
    </div>
  );
}
