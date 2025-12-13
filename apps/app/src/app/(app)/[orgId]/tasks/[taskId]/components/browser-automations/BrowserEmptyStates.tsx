'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { ArrowRight, Globe, Loader2, MonitorSmartphone, Plus } from 'lucide-react';
import { useState } from 'react';

interface NoContextStateProps {
  isStartingAuth: boolean;
  onStartAuth: (url: string) => void;
}

export function NoContextState({ isStartingAuth, onStartAuth }: NoContextStateProps) {
  const [authUrl, setAuthUrl] = useState('https://github.com');

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-muted">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Browser Automations</h3>
            <p className="text-xs text-muted-foreground">
              Capture screenshots from authenticated web pages
            </p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <MonitorSmartphone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-medium mb-2">Connect your browser first</h4>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Browser automations require authentication. Log in to sites like GitHub, Jira, or AWS to
            capture screenshots as evidence.
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <div className="flex gap-2">
              <Input
                placeholder="https://github.com"
                value={authUrl}
                onChange={(e) => setAuthUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => onStartAuth(authUrl)} disabled={isStartingAuth || !authUrl}>
                {isStartingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Use a dedicated service account for automations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EmptyWithContextStateProps {
  onCreateClick: () => void;
}

export function EmptyWithContextState({ onCreateClick }: EmptyWithContextStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Browser Automations</h3>
              <p className="text-xs text-muted-foreground">
                Capture screenshots from authenticated web pages
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
            Connected
          </Badge>
        </div>
      </div>
      <div className="p-5">
        <button
          onClick={onCreateClick}
          className="w-full flex items-center gap-4 p-4 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all group text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Create Browser Automation
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Navigate to any page and capture a screenshot as evidence
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </button>
      </div>
    </div>
  );
}
