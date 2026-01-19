'use client';

import { cn } from '@comp/ui/cn';
import { CheckCircle2, Image as ImageIcon,XCircle } from 'lucide-react';
import { useState } from 'react';

import { FleetPolicy } from "../types";
import { Button } from '@comp/ui/button';
import { PolicyImagePreviewModal } from './PolicyImagePreviewModal';

interface PolicyItemProps {
  policy: FleetPolicy;
}

export const PolicyItem = ({ policy }: PolicyItemProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div
      className={cn(
        'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
        policy.response === 'pass' ? 'border-l-primary' : 'border-l-red-500',
      )}
    >
      <p className="font-medium">{policy.name}</p>
      <div className="flex items-center gap-3">
      {(policy?.attachments || []).length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-slate-700"
            onClick={() => setIsPreviewOpen(true)}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}
        {policy.response === 'pass' ? (
          <div className="flex items-center gap-1 text-primary">
            <CheckCircle2 size={16} />
            <span>Pass</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-600">
            <XCircle size={16} />
            <span>Fail</span>
          </div>
        )}
      </div>
      <PolicyImagePreviewModal
        images={policy?.attachments || []}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </div>
  );
};