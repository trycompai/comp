'use client';

import { filterCertifications } from '@/components/vendor-risk-assessment/filter-certifications';
import { parseVendorRiskAssessmentDescription } from '@/components/vendor-risk-assessment/parse-vendor-risk-assessment-description';
import type { VendorRiskAssessmentCertification } from '@/components/vendor-risk-assessment/vendor-risk-assessment-types';
import { cn } from '@/lib/utils';
import type { Vendor } from '@db';
import type { Prisma } from '@prisma/client';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  HIPAA,
  ISO27001,
  ISO42001,
  SOC2Type1,
  SOC2Type2,
} from '@/app/(app)/[orgId]/trust/portal-settings/components/logos';
import { Button } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import { UpdateTitleAndDescriptionSheet } from './title-and-description/update-title-and-description-sheet';

// Vendor with risk assessment data merged from GlobalVendors
type VendorWithRiskAssessment = Vendor & {
  riskAssessmentData?: Prisma.InputJsonValue | null;
  riskAssessmentVersion?: string | null;
  riskAssessmentUpdatedAt?: Date | null;
};

interface VendorHeaderProps {
  vendor: VendorWithRiskAssessment;
  isEditSheetOpen: boolean;
  onEditSheetOpenChange: (open: boolean) => void;
  onVendorUpdated: () => void;
}

/**
 * Get the compliance icon component for a certification type
 */
function getCertificationIcon(cert: VendorRiskAssessmentCertification) {
  const typeLower = cert.type.toLowerCase().trim();

  // ISO 27001
  if (typeLower.includes('iso') && typeLower.includes('27001')) {
    return ISO27001;
  }

  // ISO 42001
  if (typeLower.includes('iso') && typeLower.includes('42001')) {
    return ISO42001;
  }

  // SOC 2 Type 1
  if (
    typeLower.includes('soc') &&
    (typeLower.includes('type 1') || typeLower.includes('type i')) &&
    !typeLower.includes('type 2') &&
    !typeLower.includes('type ii')
  ) {
    return SOC2Type1;
  }

  // SOC 2 Type 2
  if (
    typeLower.includes('soc') &&
    (typeLower.includes('type 2') || typeLower.includes('type ii'))
  ) {
    return SOC2Type2;
  }

  // HIPAA
  if (typeLower === 'hipaa' || typeLower === 'hipa') {
    return HIPAA;
  }

  return null;
}

export function VendorHeader({
  vendor,
  isEditSheetOpen,
  onEditSheetOpenChange,
  onVendorUpdated,
}: VendorHeaderProps) {
  // Parse risk assessment data to get certifications and links
  // Note: This should come from GlobalVendors, but we're reading from vendor for now
  // TODO: Update to fetch from GlobalVendors via vendor.website lookup
  const { certifications, links } = useMemo(() => {
    if (!vendor.riskAssessmentData) return { certifications: [], links: [] };
    const data = parseVendorRiskAssessmentDescription(
      typeof vendor.riskAssessmentData === 'string'
        ? vendor.riskAssessmentData
        : JSON.stringify(vendor.riskAssessmentData),
    );
    return {
      certifications: filterCertifications(data?.certifications),
      links: data?.links ?? [],
    };
  }, [vendor.riskAssessmentData]);

  return (
    <>
      <div className="mb-4 space-y-2">
        {certifications.filter((cert) => cert.status === 'verified').length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {certifications
              .filter((cert) => {
                // Only show verified certifications
                return cert.status === 'verified';
              })
              .map((cert, index) => {
                const IconComponent = getCertificationIcon(cert);

                if (!IconComponent) return null;

                const iconContent = (
                  <div
                    className={cn(
                      'inline-flex items-center justify-center',
                      'transition-all duration-300 ease-out',
                      'w-[24px] h-[28px] shrink-0 overflow-hidden', // Proportionally smaller
                      cert.url && ['cursor-pointer', 'hover:scale-[1.02]', 'active:scale-[0.99]'],
                    )}
                    title={cert.type} // Show full text on hover
                  >
                    <IconComponent className="h-[24px] w-[24px] max-h-[24px] max-w-[24px]" />
                  </div>
                );

                if (cert.url) {
                  return (
                    <Link
                      key={`${cert.type}-${index}`}
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      {iconContent}
                    </Link>
                  );
                }

                return <div key={`${cert.type}-${index}`}>{iconContent}</div>;
              })}
          </div>
        )}
        {links.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {links.map((link, index) => {
              return (
                <Button
                  key={`${link.url}-${link.label}-${index}`}
                  variant="outline"
                  size="sm"
                  iconRight={<Launch size={12} />}
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                >
                  {link.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
      <UpdateTitleAndDescriptionSheet
        vendor={vendor}
        open={isEditSheetOpen}
        onOpenChange={onEditSheetOpenChange}
        onVendorUpdated={onVendorUpdated}
      />
    </>
  );
}
