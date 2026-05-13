'use client';

import { useAccessRevocations } from '@/hooks/use-access-revocations';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Text,
} from '@trycompai/design-system';
import { Checkmark, ChevronDown, Search } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const MONOGRAM_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-pink-500',
];

function getMonogramColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length];
}

interface AccessRevocationListProps {
  memberId: string;
  canEdit: boolean;
  onRevocationChange?: () => void;
}

export function AccessRevocationList({
  memberId,
  canEdit,
  onRevocationChange,
}: AccessRevocationListProps) {
  const { revocations, isLoading, revokeAccess, undoRevocation, revokeAll } =
    useAccessRevocations(memberId);
  const [processingVendorId, setProcessingVendorId] = useState<string | null>(
    null,
  );
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [remainingOpen, setRemainingOpen] = useState(true);
  const [revokedOpen, setRevokedOpen] = useState(true);

  const { remaining, revoked } = useMemo(() => {
    if (!revocations) return { remaining: [], revoked: [] };
    const filtered = revocations.vendors.filter((v) =>
      v.vendorName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return {
      remaining: filtered.filter((v) => !v.revoked),
      revoked: filtered.filter((v) => v.revoked),
    };
  }, [revocations, searchQuery]);

  const handleRevoke = async (vendorId: string) => {
    setProcessingVendorId(vendorId);
    try {
      await revokeAccess(vendorId);
      toast.success('Access removal confirmed');
      onRevocationChange?.();
    } catch {
      toast.error('Failed to confirm access removal');
    } finally {
      setProcessingVendorId(null);
    }
  };

  const handleUndo = async (vendorId: string) => {
    setProcessingVendorId(vendorId);
    try {
      await undoRevocation(vendorId);
      toast.success('Revocation undone');
      onRevocationChange?.();
    } catch {
      toast.error('Failed to undo revocation');
    } finally {
      setProcessingVendorId(null);
    }
  };

  const handleConfirmAll = async () => {
    setIsConfirmingAll(true);
    try {
      await revokeAll();
      toast.success('All vendor access removals confirmed');
      onRevocationChange?.();
    } catch {
      toast.error('Failed to confirm all');
    } finally {
      setIsConfirmingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-2">
        <Text variant="muted">Loading vendor access list...</Text>
      </div>
    );
  }

  if (!revocations || revocations.vendors.length === 0) {
    return (
      <div className="py-2">
        <Text variant="muted">
          No vendors configured. Add vendors to your organization to track
          access revocation.
        </Text>
      </div>
    );
  }

  const allConfirmed = revocations.revokedCount === revocations.totalVendors;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <InputGroup>
          <InputGroupAddon variant="icon">
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
        {canEdit && !allConfirmed && (
          <div className="shrink-0">
            <Button
              size="sm"
              onClick={handleConfirmAll}
              disabled={isConfirmingAll}
              loading={isConfirmingAll}
            >
              Bulk confirm
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Collapsible open={remainingOpen} onOpenChange={setRemainingOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown
              size={14}
              className={`transition-transform ${remainingOpen ? '' : '-rotate-90'}`}
            />
            Remaining · {remaining.length}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto pt-1">
              {remaining.map((vendor) => (
                <VendorRow
                  key={vendor.vendorId}
                  vendor={vendor}
                  canEdit={canEdit}
                  isProcessing={processingVendorId === vendor.vendorId}
                  onRevoke={() => handleRevoke(vendor.vendorId)}
                />
              ))}
              {remaining.length === 0 && (
                <div className="py-2">
                  <Text size="sm" variant="muted">
                    {searchQuery ? 'No matching vendors' : 'All vendor access revoked'}
                  </Text>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={revokedOpen} onOpenChange={setRevokedOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown
              size={14}
              className={`transition-transform ${revokedOpen ? '' : '-rotate-90'}`}
            />
            Revoked · {revoked.length}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto pt-1">
              {revoked.map((vendor) => (
                <RevokedVendorRow
                  key={vendor.vendorId}
                  vendor={vendor}
                  canEdit={canEdit}
                  isProcessing={processingVendorId === vendor.vendorId}
                  onUndo={() => handleUndo(vendor.vendorId)}
                />
              ))}
              {revoked.length === 0 && (
                <div className="py-2">
                  <Text size="sm" variant="muted">
                    {searchQuery ? 'No matching vendors' : 'No vendors revoked yet'}
                  </Text>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function VendorMonogram({ name }: { name: string }) {
  const color = getMonogramColor(name);
  const letter = name.charAt(0).toUpperCase();
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${color}`}
    >
      {letter}
    </div>
  );
}

interface VendorRowProps {
  vendor: { vendorId: string; vendorName: string };
  canEdit: boolean;
  isProcessing: boolean;
  onRevoke: () => void;
}

function VendorRow({ vendor, canEdit, isProcessing, onRevoke }: VendorRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2.5">
        <VendorMonogram name={vendor.vendorName} />
        <span className="text-sm font-medium">{vendor.vendorName}</span>
      </div>
      {canEdit && (
        <div className="shrink-0">
          <Button
            variant="outline"
            size="xs"
            onClick={onRevoke}
            disabled={isProcessing}
            loading={isProcessing}
          >
            Confirm revoked
          </Button>
        </div>
      )}
    </div>
  );
}

interface RevokedVendorRowProps {
  vendor: {
    vendorId: string;
    vendorName: string;
    revokedAt: string | null;
    revokedBy: { id: string; name: string; email: string } | null;
  };
  canEdit: boolean;
  isProcessing: boolean;
  onUndo: () => void;
}

function RevokedVendorRow({
  vendor,
  canEdit,
  isProcessing,
  onUndo,
}: RevokedVendorRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2.5">
        <VendorMonogram name={vendor.vendorName} />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{vendor.vendorName}</span>
          {vendor.revokedBy && vendor.revokedAt && (
            <span className="text-xs text-muted-foreground">
              {vendor.revokedBy.name} ·{' '}
              {format(new Date(vendor.revokedAt), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canEdit && (
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={onUndo}
              disabled={isProcessing}
              loading={isProcessing}
            >
              Undo
            </Button>
          </div>
        )}
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
          <Checkmark size={12} />
        </div>
      </div>
    </div>
  );
}
