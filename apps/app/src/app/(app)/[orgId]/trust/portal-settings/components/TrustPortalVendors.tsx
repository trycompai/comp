'use client';

import { Button, Switch } from '@trycompai/design-system';
import { ChevronLeft, ChevronRight } from '@trycompai/design-system/icons';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { updateVendorTrustSettingsAction } from '../actions/vendor-settings';
import { useAction } from 'next-safe-action/hooks';
import {
  ISO27001,
  ISO42001,
  ISO9001,
  SOC2Type2,
  GDPR,
  HIPAA,
  PCIDSS,
  NEN7510,
} from './logos';

interface ComplianceBadge {
  type: 'soc2' | 'iso27001' | 'iso42001' | 'gdpr' | 'hipaa' | 'pci_dss' | 'nen7510' | 'iso9001';
  verified: boolean;
}

interface Vendor {
  id: string;
  name: string;
  description: string;
  website: string | null;
  showOnTrustPortal: boolean;
  logoUrl: string | null;
  complianceBadges: ComplianceBadge[] | null;
}

interface TrustPortalVendorsProps {
  initialVendors: Vendor[];
  orgId: string;
}

/**
 * Badge type to icon component mapping
 */
const BADGE_ICONS: Record<ComplianceBadge['type'], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  soc2: SOC2Type2,
  iso27001: ISO27001,
  iso42001: ISO42001,
  gdpr: GDPR,
  hipaa: HIPAA,
  pci_dss: PCIDSS,
  nen7510: NEN7510,
  iso9001: ISO9001,
};

/**
 * Badge type labels for tooltips
 */
const BADGE_LABELS: Record<ComplianceBadge['type'], string> = {
  soc2: 'SOC 2',
  iso27001: 'ISO 27001',
  iso42001: 'ISO 42001',
  gdpr: 'GDPR',
  hipaa: 'HIPAA',
  pci_dss: 'PCI DSS',
  nen7510: 'NEN 7510',
  iso9001: 'ISO 9001',
};

/**
 * Extract domain from a URL for use with Clearbit Logo API
 * Keeps subdomains as Clearbit supports branded subdomains (e.g., aws.amazon.com)
 * Only removes 'www.' prefix
 */
function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    // Just remove www. prefix, keep other subdomains (aws.amazon.com, cloud.google.com, etc.)
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Get logo URL using Google Favicon API (free and reliable)
 * Returns a 128px favicon/logo for the domain
 */
function getVendorLogoUrl(website: string | null): string | null {
  const domain = extractDomain(website);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Vendor logo component with fallback to initials
 * Clickable if website URL is provided
 */
function VendorLogo({ name, website, storedLogoUrl }: { name: string; website: string | null; storedLogoUrl: string | null }) {
  const [hasError, setHasError] = useState(false);
  // Use stored logo URL first, fall back to computed Google Favicon URL
  const logoUrl = storedLogoUrl || getVendorLogoUrl(website);

  // Reset error state when URL changes
  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  // Fallback to initials
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const logoContent = !logoUrl || hasError ? (
    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-lg font-medium text-muted-foreground">
      {initials}
    </div>
  ) : (
    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className="h-12 w-12 object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );

  // Make logo clickable if website exists
  if (website) {
    return (
      <a
        href={website}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-80"
      >
        {logoContent}
      </a>
    );
  }

  return logoContent;
}

const ITEMS_PER_PAGE = 5;

export function TrustPortalVendors({
  initialVendors,
  orgId,
}: TrustPortalVendorsProps) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [currentPage, setCurrentPage] = useState(1);

  const updateVendor = useAction(updateVendorTrustSettingsAction, {
    onSuccess: ({ data }) => {
      if (data) {
        setVendors((prev) =>
          prev.map((v) => (v.id === data.id ? { ...v, ...data } as Vendor : v)),
        );
        toast.success('Vendor settings updated');
      }
    },
    onError: () => {
      toast.error('Failed to update vendor settings');
    },
  });

  const handleToggleVisibility = (vendorId: string, currentValue: boolean) => {
    updateVendor.execute({
      vendorId,
      showOnTrustPortal: !currentValue,
    });
  };

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(vendors.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedVendors = useMemo(
    () => vendors.slice(startIndex, endIndex),
    [vendors, startIndex, endIndex],
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">Vendors</h3>
        <p className="text-sm text-muted-foreground">
          Configure which vendors appear on your public trust portal
        </p>
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No vendors found. Go to the Vendors page to add vendors.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {paginatedVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="rounded-md border border-border bg-background overflow-hidden flex flex-col"
            >
              {/* Vendor Content */}
              <div className="flex items-center gap-4 p-4 flex-1">
                <VendorLogo name={vendor.name} website={vendor.website} storedLogoUrl={vendor.logoUrl} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate mb-2">{vendor.name}</h4>
                  {vendor.complianceBadges && vendor.complianceBadges.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {vendor.complianceBadges.map((badge) => {
                        const IconComponent = BADGE_ICONS[badge.type];
                        if (!IconComponent) return null;
                        return (
                          <div
                            key={badge.type}
                            className="inline-flex items-center justify-center w-[36px] h-[40px] shrink-0 overflow-hidden"
                            title={BADGE_LABELS[badge.type]}
                          >
                            <IconComponent className="h-[36px] w-[36px] max-h-[36px] max-w-[36px]" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Footer with Visibility Toggle */}
              <div className="border-t border-border bg-muted/30 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Trust Portal Visibility</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={vendor.showOnTrustPortal}
                    onCheckedChange={() =>
                      handleToggleVisibility(vendor.id, vendor.showOnTrustPortal)
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {vendor.showOnTrustPortal ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, vendors.length)} of{' '}
                {vendors.length} vendors
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  iconLeft={<ChevronLeft size={16} />}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  iconRight={<ChevronRight size={16} />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
