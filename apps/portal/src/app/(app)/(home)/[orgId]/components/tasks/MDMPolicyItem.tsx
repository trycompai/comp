'use client';

import { cn } from '@comp/ui/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import type { Host } from '../../types';

interface MDMPolicyItemProps {
  host: Host | null;
}

export function MDMPolicyItem({ host }: MDMPolicyItemProps) {
  const status = host?.mdm.connected_to_fleet ? 'pass' : 'fail';
  const name = 'MDM Enabled';
  const hostId = host?.id ?? null;

  return (
    <div
      className={cn(
        'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
        status === 'pass' ? 'border-l-green-500' : 'border-l-red-500',
      )}
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{name}</p>
        {status === 'fail' && hostId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  There are additional steps required to enable MDM. Please check{' '}
                  <a
                    href="https://trycomp.ai/docs/device-agent#mdm-user-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    this documentation
                  </a>
                  .
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {status === 'pass' ? (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle2 size={16} />
          <span className="text-sm">Pass</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <XCircle size={16} />
          <span className="text-sm">Fail</span>
        </div>
      )}
    </div>
  );
}