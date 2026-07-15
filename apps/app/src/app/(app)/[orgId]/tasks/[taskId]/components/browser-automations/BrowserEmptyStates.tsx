'use client';

import { Badge, Button } from '@trycompai/design-system';
import { Add, ArrowRight, Globe, Locked } from '@trycompai/design-system/icons';

const SETUP_STEPS = [
  { n: '01', title: 'Connect a login', desc: 'Sign in to the vendor once.' },
  { n: '02', title: 'Describe what to capture', desc: 'In plain English.' },
  { n: '03', title: 'Evidence, on schedule', desc: 'Screenshots land in this task.' },
];

interface NoContextStateProps {
  isStartingAuth: boolean;
  onConnect: () => void;
}

export function NoContextState({ isStartingAuth, onConnect }: NoContextStateProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_280px]">
        {/* Left — the pitch + primary action */}
        <div className="flex flex-col p-6 sm:p-7">
          <h2 className="text-lg font-medium tracking-tight text-foreground">
            Browser Automations
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            When a vendor has no integration, Comp AI signs in to its website on a schedule and
            captures a screenshot as audit evidence.
          </p>

          <div className="mt-auto pt-5">
            <Button onClick={onConnect} loading={isStartingAuth} disabled={isStartingAuth}>
              Connect a Vendor Login
            </Button>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Locked size={12} className="shrink-0" />
              Encrypted · stored in 1Password · evidence only
            </div>
          </div>
        </div>

        {/* Right — quiet "how it works" rail */}
        <div className="flex flex-col gap-3.5 border-t border-border bg-muted p-6 sm:border-l sm:border-t-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            How it works
          </div>
          {SETUP_STEPS.map((step) => (
            <div key={step.n} className="flex gap-2.5">
              <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{step.n}</span>
              <div className="text-xs leading-normal">
                <span className="text-foreground">{step.title}</span>
                <br />
                <span className="text-[11px] text-muted-foreground">{step.desc}</span>
              </div>
            </div>
          ))}
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
