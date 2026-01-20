'use client';

import { useState } from 'react';

import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { CheckCircle2, HelpCircle, Image, Upload, XCircle } from 'lucide-react';
import type { FleetPolicy } from '../../types';
import { PolicyImageUploadModal } from './PolicyImageUploadModal';
import { PolicyImagePreviewModal } from './PolicyImagePreviewModal';

interface FleetPolicyItemProps {
  policy: FleetPolicy;
}

export function FleetPolicyItem({ policy }: FleetPolicyItemProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
          policy.response === 'pass' ? 'border-l-green-500' : 'border-l-red-500',
        )}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{policy.name}</p>
          {policy.name === 'MDM Enabled' && policy.response === 'fail' && (
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
        <div className="flex items-center gap-3">
          {policy.response === 'pass' ? (
            <>
              {(policy?.attachments || []).length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-500 hover:text-slate-700"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Image className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 size={16} />
                <span className="text-sm">Pass</span>
              </div>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-slate-700"
                onClick={() => setIsUploadOpen(true)}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle size={16} />
                <span className="text-sm">Fail</span>
              </div>
            </>
          )}
        </div>
      </div>
      <PolicyImageUploadModal
        policy={policy}
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
      />
      <PolicyImagePreviewModal
        images={policy?.attachments || []}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </>
  );
}