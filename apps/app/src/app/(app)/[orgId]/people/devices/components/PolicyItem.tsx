'use client';

import { cn } from '@comp/ui/cn';
import { CheckCircle2, Image as ImageIcon, MoreVertical, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';

import { FleetPolicy } from "../types";
import { Button } from '@comp/ui/button';
import { PolicyImagePreviewModal } from './PolicyImagePreviewModal';

interface PolicyItemProps {
  policy: FleetPolicy;
}

export const PolicyItem = ({ policy }: PolicyItemProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const actions = useMemo(() => {
    if ((policy?.attachments || []).length > 0 && policy.response === 'pass') {
      return [
        {
          label: 'Preview images',
          renderIcon: () => <ImageIcon className="h-4 w-4" />,
          onClick: () => setIsPreviewOpen(true),
        },
      ];
    }

    return [];
  }, [policy]);

  return (
    <div
      className={cn(
        'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
        policy.response === 'pass' ? 'border-l-primary' : 'border-l-red-500',
      )}
    >
      <p className="font-medium">{policy.name}</p>
      <div className="flex items-center gap-3">
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
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={actions.length === 0}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map(({ label, renderIcon, onClick }) => (
              <DropdownMenuItem
                key={label}
                onSelect={(event) => {
                  event.preventDefault();
                  onClick();
                  setDropdownOpen(false);
                }}
              >
                {renderIcon()}
                <span>{label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <PolicyImagePreviewModal
        images={policy?.attachments || []}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </div>
  );
};