'use client';

import { useMemo, useState } from 'react';

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@trycompai/design-system';
import {
  CheckmarkFilled,
  CloseOutline,
  Help,
  Image as ImageIcon,
  OverflowMenuVertical,
  TrashCan,
  Upload,
} from '@trycompai/design-system/icons';
import type { FleetPolicy } from '../../types';
import { PolicyImagePreviewModal } from './PolicyImagePreviewModal';
import { PolicyImageUploadModal } from './PolicyImageUploadModal';
import { PolicyImageResetModal } from './PolicyImageResetModal';

interface FleetPolicyItemProps {
  policy: FleetPolicy;
  organizationId: string;
  onRefresh: () => void;
}

export function FleetPolicyItem({ policy, organizationId, onRefresh }: FleetPolicyItemProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const actions = useMemo(() => {
    if (policy.response === 'pass') {
      if ((policy?.attachments || []).length > 0) {
        return [
          {
            label: 'Preview images',
            renderIcon: () => <span className="mr-2"><ImageIcon size={16} /></span>,
            onClick: () => setIsPreviewOpen(true),
          },
          {
            label: 'Remove images',
            renderIcon: () => <span className="mr-2"><TrashCan size={16} /></span>,
            onClick: () => setIsRemoveOpen(true),
          },
        ];
      }

      return [];
    }

    return [
      {
        label: 'Upload images',
        renderIcon: () => <span className="mr-2"><Upload size={16} /></span>,
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
                <TooltipTrigger>
                  <span className="text-muted-foreground hover:text-foreground transition-colors inline-flex">
                    <Help size={14} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
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
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-3">
          {policy.response === 'pass' ? (
            <div className="flex items-center gap-1 text-primary">
              <CheckmarkFilled size={16} />
              <span className="text-sm">Pass</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <CloseOutline size={16} />
              <span className="text-sm">Fail</span>
            </div>
          )}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                disabled={!hasActions}
                iconLeft={<OverflowMenuVertical size={16} />}
              >
                Actions
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
        organizationId={organizationId}
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onRefresh={onRefresh}
      />
      <PolicyImagePreviewModal
        images={policy?.attachments || []}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
      <PolicyImageResetModal
        open={isRemoveOpen}
        organizationId={organizationId}
        policyId={policy.id}
        onOpenChange={setIsRemoveOpen}
        onRefresh={onRefresh}
      />
    </>
  );
}
