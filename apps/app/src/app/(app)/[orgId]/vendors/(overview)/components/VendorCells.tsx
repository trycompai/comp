import { VendorStatus } from '@/components/vendor-status';
import {
  HStack,
  Spinner,
  Text,
} from '@trycompai/design-system';
import { useVendorOnboardingStatus } from './vendor-onboarding-context';
import type { VendorRow } from './VendorsTable';

interface VendorNameCellProps {
  vendor: VendorRow;
}

export function VendorNameCell({ vendor }: VendorNameCellProps) {
  const onboardingStatus = useVendorOnboardingStatus();
  const status = onboardingStatus[vendor.id];
  const isPending = vendor.isPending || status === 'pending' || status === 'processing';
  const isAssessing = vendor.isAssessing || status === 'assessing';
  const isResolved = vendor.status === 'assessed';

  if ((isPending || isAssessing) && !isResolved) {
    return (
      <HStack gap="2" align="center">
        <Spinner />
        <Text variant="muted">{vendor.name}</Text>
      </HStack>
    );
  }

  return <Text>{vendor.name}</Text>;
}

interface VendorStatusCellProps {
  vendor: VendorRow;
}

export function VendorStatusCell({ vendor }: VendorStatusCellProps) {
  const onboardingStatus = useVendorOnboardingStatus();
  const status = onboardingStatus[vendor.id];
  const isPending = vendor.isPending || status === 'pending' || status === 'processing';
  const isAssessing = vendor.isAssessing || status === 'assessing';
  const isResolved = vendor.status === 'assessed';

  if (isPending && !isResolved) {
    return (
      <HStack gap="2" align="center">
        <Spinner />
        <Text variant="muted" size="sm">
          Creating...
        </Text>
      </HStack>
    );
  }

  if (isAssessing && !isResolved) {
    return (
      <HStack gap="2" align="center">
        <Spinner />
        <Text variant="muted" size="sm">
          Assessing...
        </Text>
      </HStack>
    );
  }

  return <VendorStatus status={vendor.status} />;
}
