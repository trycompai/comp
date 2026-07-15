'use client';

import { Badge, Button } from '@trycompai/design-system';
import { Add, ArrowRight, Globe, Locked } from '@trycompai/design-system/icons';

const SETUP_STEPS = [
  {
    n: '01',
    title: 'Connect a login',
    desc: 'Sign in to the vendor once. We keep it connected.',
  },
  {
    n: '02',
    title: 'Describe what to capture',
    desc: 'In plain English — like instructions to a colleague.',
  },
  {
    n: '03',
    title: 'Evidence, on schedule',
    desc: 'Screenshots land in this task automatically.',
  },
];

interface NoContextStateProps {
  isStartingAuth: boolean;
  onConnect: () => void;
}

export function NoContextState({ isStartingAuth, onConnect }: NoContextStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
      <h2 className="text-xl font-medium tracking-tight text-foreground">Browser automations</h2>
      <p className="mt-1.5 max-w-xl text-sm text-muted-foreground leading-relaxed">
        Prove controls on vendor sites that have no API — Comp AI signs in, navigates to the right
        page, and files a screenshot as evidence.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SETUP_STEPS.map((step) => (
          <div key={step.n} className="rounded-md border border-border p-4">
            <div className="font-mono text-xs text-muted-foreground">{step.n}</div>
            <div className="mt-2 text-sm text-foreground">{step.title}</div>
            <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button onClick={onConnect} loading={isStartingAuth} disabled={isStartingAuth}>
          Connect a vendor login
          <ArrowRight size={14} />
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Locked size={12} className="shrink-0" />
          Encrypted, stored in 1Password, used only to collect evidence
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
          <Badge variant="outline">
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
            <Add className="w-5 h-5 text-primary" />
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
