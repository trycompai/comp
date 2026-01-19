'use client';

import { useState } from 'react';

import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { CheckCircle2, Image, Upload, XCircle } from 'lucide-react';
import type { FleetPolicy } from '../../types';
import { PolicyImageUploadModal } from './PolicyImageUploadModal';

interface FleetPolicyItemProps {
  policy: FleetPolicy;
}

export function FleetPolicyItem({ policy }: FleetPolicyItemProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
          policy.response === 'pass' ? 'border-l-green-500' : 'border-l-red-500',
        )}
      >
        <p className="text-sm font-medium">{policy.name}</p>
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
            <Image className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-slate-700"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="h-4 w-4" />
          </Button>
          {policy.response !== 'pass' ? (
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
      </div>
      <PolicyImageUploadModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        policyId={String(policy.id)}
      />
    </>
  );
}