'use client';

import { Button } from '@comp/ui/button';
import { Loader2, MonitorPlay, MonitorSmartphone, RefreshCw } from 'lucide-react';

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
  const Icon = variant === 'auth' ? MonitorSmartphone : MonitorPlay;
  const iconClass = variant === 'execution' ? 'text-primary animate-pulse' : 'text-primary';
  const bgClass = variant === 'execution' ? 'bg-primary/10' : 'bg-muted';

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
                <Loader2 className="h-3 w-3 animate-spin" />
                Executing...
              </div>
            )}
            {variant === 'auth' && onSave && (
              <Button variant="outline" size="sm" onClick={onSave} disabled={isChecking}>
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Save & Close
                  </>
                )}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="overflow-hidden rounded-lg border">
          <iframe
            src={liveViewUrl}
            className="h-[500px] w-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
}
