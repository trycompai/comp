import { SecondaryMenu } from '@comp/ui/secondary-menu';

interface VendorTabsProps {
  vendorId: string;
  orgId: string;
}

export function VendorTabs({ vendorId, orgId }: VendorTabsProps) {
  const items = [
    {
      path: `/${orgId}/vendors/${vendorId}`,
      label: 'Overview',
    },
    {
      path: `/${orgId}/vendors/${vendorId}/review`,
      label: 'Risk Assessment',
    },
  ];

  return <SecondaryMenu items={items} />;
}

