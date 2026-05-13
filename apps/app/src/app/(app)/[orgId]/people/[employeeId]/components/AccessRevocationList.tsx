'use client';

import { useAccessRevocations } from '@/hooks/use-access-revocations';
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Text,
} from '@trycompai/design-system';
import {
  Checkmark,
  DocumentAttachment,
  Search,
} from '@trycompai/design-system/icons';
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
      <div className="border-t bg-muted py-4 pl-11 pr-3.5">
        <Text variant="muted">Loading vendor access list...</Text>
      </div>
    );
  }

  if (!revocations || revocations.vendors.length === 0) {
    return (
      <div className="border-t bg-muted py-4 pl-11 pr-3.5">
        <Text variant="muted">
          No vendors configured. Add vendors to your organization to track
          access revocation.
        </Text>
      </div>
    );
  }

  const allConfirmed = revocations.revokedCount === revocations.totalVendors;

  return (
    <div className="border-t bg-muted">
      <div className="flex items-center gap-2 border-b bg-background py-2 pl-11 pr-3.5">
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

      {remaining.length > 0 && (
        <>
          <SectionHeader label="Remaining" count={remaining.length} />
          <div className="max-h-[280px] overflow-y-auto">
            {remaining.map((vendor) => (
              <VendorRow
                key={vendor.vendorId}
                vendor={vendor}
                canEdit={canEdit}
                isProcessing={processingVendorId === vendor.vendorId}
                onRevoke={() => handleRevoke(vendor.vendorId)}
              />
            ))}
          </div>
        </>
      )}

      {revoked.length > 0 && (
        <>
          <SectionHeader label="Revoked" count={revoked.length} />
          <div className="max-h-[280px] overflow-y-auto">
            {revoked.map((vendor) => (
              <RevokedVendorRow
                key={vendor.vendorId}
                vendor={vendor}
                canEdit={canEdit}
                isProcessing={processingVendorId === vendor.vendorId}
                onUndo={() => handleUndo(vendor.vendorId)}
              />
            ))}
          </div>
        </>
      )}

      {remaining.length === 0 && revoked.length === 0 && (
        <div className="py-4 pl-11 pr-3.5">
          <Text size="sm" variant="muted">
            {searchQuery ? 'No matching vendors' : 'No vendors found'}
          </Text>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-muted py-2 pl-11 pr-3.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
        <span className="text-muted-foreground/60"> &middot; {count}</span>
      </span>
    </div>
  );
}

function VendorMark({ name }: { name: string }) {
  const color = getMonogramColor(name);
  const letter = name.charAt(0).toUpperCase();
  return (
    <div
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm text-[10px] font-bold text-white ${color}`}
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
    <div className="flex items-center justify-between border-b bg-background py-2.5 pl-11 pr-3.5">
      <div className="flex items-center gap-2.5">
        <VendorMark name={vendor.vendorName} />
        <span className="text-[13px] font-normal">{vendor.vendorName}</span>
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <DocumentAttachment size={12} />
            Attach evidence
          </button>
          <div>
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
    <div className="flex items-center justify-between border-b bg-background py-2.5 pl-11 pr-3.5">
      <div className="flex items-center gap-2.5">
        <VendorMark name={vendor.vendorName} />
        <span className="text-[13px] font-normal">{vendor.vendorName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {vendor.revokedBy && vendor.revokedAt && (
          <span className="font-mono text-xs text-muted-foreground">
            {vendor.revokedBy.name} &middot;{' '}
            {format(new Date(vendor.revokedAt), 'MMM d, yyyy')}
          </span>
        )}
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
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Checkmark size={12} />
        </div>
      </div>
    </div>
  );
}
