'use client';

import { Input } from '@trycompai/ui/input';
import { AlertTriangle, ListOrdered } from 'lucide-react';

interface AcknowledgmentPanelProps {
  requiresAcknowledgment?: 'type-to-confirm' | 'checkbox';
  acknowledgmentMessage?: string;
  confirmationPhrase?: string;
  guidedOnly?: boolean;
  guidedSteps?: string[];
  onAcknowledgmentChange: (value: string | null) => void;
  acknowledged: boolean;
}

export function AcknowledgmentPanel({
  requiresAcknowledgment,
  acknowledgmentMessage,
  confirmationPhrase,
  guidedOnly,
  guidedSteps,
  onAcknowledgmentChange,
  acknowledged,
}: AcknowledgmentPanelProps) {
  if (guidedOnly) {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
        <div className="mb-2 flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Manual Steps Required
          </span>
        </div>
        <p className="mb-2 text-xs text-blue-600 dark:text-blue-400">
          This remediation must be performed manually. Follow these steps:
        </p>
        {guidedSteps && guidedSteps.length > 0 && (
          <ol className="list-inside list-decimal space-y-1.5">
            {guidedSteps.map((step, index) => (
              <li
                key={index}
                className="text-sm text-blue-700 dark:text-blue-300"
              >
                {step}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  if (requiresAcknowledgment === 'type-to-confirm') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {acknowledgmentMessage}
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Type{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-semibold">
              {confirmationPhrase}
            </code>{' '}
            to confirm
          </label>
          <Input
            placeholder={confirmationPhrase}
            onChange={(e) =>
              onAcknowledgmentChange(e.target.value || null)
            }
            className={
              acknowledged
                ? 'border-emerald-300 focus-visible:ring-emerald-500'
                : ''
            }
          />
        </div>
      </div>
    );
  }

  if (requiresAcknowledgment === 'checkbox') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {acknowledgmentMessage}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) =>
              onAcknowledgmentChange(
                e.target.checked ? 'acknowledged' : null,
              )
            }
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-muted-foreground">
            I understand the risks
          </span>
        </label>
      </div>
    );
  }

  return null;
}
