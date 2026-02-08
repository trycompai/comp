'use client';

import { useMemo, useState } from 'react';

import { cn } from '@comp/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { Badge, Button } from '@trycompai/design-system';
import {
  Help,
  Image as ImageIcon,
  OverflowMenuVertical,
  Upload,
} from '@trycompai/design-system/icons';
import type { FleetPolicy } from '../../types';
import { PolicyImagePreviewModal } from './PolicyImagePreviewModal';
import { PolicyImageUploadModal } from './PolicyImageUploadModal';

interface FleetPolicyItemProps {
  policy: FleetPolicy;
  onRefresh: () => void;
}

export function FleetPolicyItem({ policy, onRefresh }: FleetPolicyItemProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const actions = useMemo(() => {
    if (policy.response === 'pass') {
      if ((policy?.attachments || []).length > 0) {
        return [
          {
            label: 'Preview images',
            renderIcon: () => <ImageIcon size={16} className="mr-2" />,
            onClick: () => setIsPreviewOpen(true),
          },
        ];
      }

      return [];
    }

    return [
      {
        label: 'Upload images',
        renderIcon: () => <Upload size={16} className="mr-2" />,
        onClick: () => setIsUploadOpen(true),
      },
    ];
  }, [policy]);

  const hasActions = useMemo(() => actions.length > 0, [actions]);

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
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Help size={14} />
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
          <Badge variant={policy.response === 'pass' ? 'default' : 'destructive'}>
            {policy.response === 'pass' ? 'Pass' : 'Fail'}
          </Badge>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!hasActions}>
                <OverflowMenuVertical size={16} />
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
      </div>
      <PolicyImageUploadModal
        policy={policy}
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onRefresh={onRefresh}
      />
      <PolicyImagePreviewModal
        images={policy?.attachments || []}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </>
  );
}
