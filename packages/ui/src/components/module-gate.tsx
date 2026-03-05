import { Check } from 'lucide-react';
import type React from 'react';
import { cn } from '../utils/cn';

interface ModuleGateProps {
  /** Small uppercase label above the headline (e.g. "Penetration Testing") */
  label: string;
  /** Bold headline — should sell the outcome, not describe the feature */
  title: string;
  /** One-sentence value prop */
  description: string;
  /** Checklist of what's included */
  features?: string[];
  /** Primary CTA */
  action: React.ReactNode;
  /** Optional secondary CTA rendered next to the primary */
  secondaryAction?: React.ReactNode;
  /** Optional product preview shown below the CTA — rendered inside a dark app-chrome frame */
  preview?: React.ReactNode;
  className?: string;
}

export function ModuleGate({
  label,
  title,
  description,
  features,
  action,
  secondaryAction,
  preview,
  className,
}: ModuleGateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center pt-10 px-4', className)}>
      <div className="flex flex-col items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl max-w-xl">{title}</h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {features && features.length > 0 && (
        <ul className="mt-6 flex flex-col gap-1.5 text-[13px] text-left">
          {features.map((item) => (
            <li key={item} className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-center gap-3 [&_button]:h-10 [&_button]:px-5 [&_button]:text-sm [&_button]:rounded-lg">
        {action}
        {secondaryAction}
      </div>

      {preview && (
        <div className="mt-10 w-full max-w-3xl overflow-hidden rounded-t-xl shadow-2xl">
          {/* Dark chrome bar */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ backgroundColor: '#1e1e1e' }}
          >
            <span className="size-3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <span className="size-3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <span className="size-3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </div>
          {/* Content area */}
          <div className="border border-t-0 bg-card">
            {preview}
          </div>
        </div>
      )}
    </div>
  );
}
