'use client';

import { useAccessRevocations } from '@/hooks/use-access-revocations';
import { Badge, Button, HStack, Stack, Text } from '@trycompai/design-system';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

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
  const { revocations, isLoading, revokeAccess, undoRevocation } =
    useAccessRevocations(memberId);
  const [processingVendorId, setProcessingVendorId] = useState<string | null>(null);

  const handleRevoke = async (vendorId: string) => {
    setProcessingVendorId(vendorId);
    try {
      await revokeAccess(vendorId);
      toast.success('Access removal confirmed');
      onRevocationChange?.();
    } catch {
      toast.error('Failed to revoke access');
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

  if (isLoading) {
    return <Text variant="muted">Loading vendor access list...</Text>;
  }

  if (!revocations || revocations.vendors.length === 0) {
    return (
      <Text variant="muted">
        No vendors configured. Add vendors to your organization to track access revocation.
      </Text>
    );
  }

  return (
    <Stack gap="2">
      <Text size="sm" variant="muted">
        {revocations.revokedCount} of {revocations.totalVendors} vendor access removals confirmed
      </Text>
      {revocations.vendors.map((vendor) => (
        <div
          key={vendor.vendorId}
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <Stack gap="0">
            <HStack gap="2" align="center">
              <Text size="sm" weight="medium">{vendor.vendorName}</Text>
              {vendor.revoked ? (
                <Badge variant="default">Confirmed</Badge>
              ) : (
                <Badge variant="secondary">Not confirmed</Badge>
              )}
            </HStack>
            {vendor.revoked && vendor.revokedBy && vendor.revokedAt && (
              <Text size="xs" variant="muted">
                by {vendor.revokedBy.name} on{' '}
                {format(new Date(vendor.revokedAt), 'MMM d, yyyy')}
              </Text>
            )}
          </Stack>
          {canEdit && (
            <div className="shrink-0 pl-3">
              {vendor.revoked ? (
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleUndo(vendor.vendorId)}
                    disabled={processingVendorId === vendor.vendorId}
                    loading={processingVendorId === vendor.vendorId}
                  >
                    Undo
                  </Button>
                </div>
              ) : (
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleRevoke(vendor.vendorId)}
                    disabled={processingVendorId === vendor.vendorId}
                    loading={processingVendorId === vendor.vendorId}
                  >
                    Confirm revoked
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </Stack>
  );
}
