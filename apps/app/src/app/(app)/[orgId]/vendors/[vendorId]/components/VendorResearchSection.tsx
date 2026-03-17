'use client';

import {
  HIPAA,
  ISO27001,
  ISO42001,
  SOC2Type1,
  SOC2Type2,
} from '@/app/(app)/[orgId]/trust/portal-settings/components/logos';
import { filterCertifications } from '@/components/vendor-risk-assessment/filter-certifications';
import { parseVendorRiskAssessmentDescription } from '@/components/vendor-risk-assessment/parse-vendor-risk-assessment-description';
import type { VendorRiskAssessmentCertification } from '@/components/vendor-risk-assessment/vendor-risk-assessment-types';
import { cn } from '@/lib/utils';
import type { Prisma } from '@prisma/client';
import { Button } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useMemo } from 'react';

function getCertificationIcon(cert: VendorRiskAssessmentCertification) {
  const typeLower = cert.type.toLowerCase().trim();

  if (typeLower.includes('iso') && typeLower.includes('27001')) return ISO27001;
  if (typeLower.includes('iso') && typeLower.includes('42001')) return ISO42001;
  if (
    typeLower.includes('soc') &&
    (typeLower.includes('type 1') || typeLower.includes('type i')) &&
    !typeLower.includes('type 2') &&
    !typeLower.includes('type ii')
  ) return SOC2Type1;
  if (
    typeLower.includes('soc') &&
    (typeLower.includes('type 2') || typeLower.includes('type ii'))
  ) return SOC2Type2;
  if (typeLower === 'hipaa' || typeLower === 'hipa') return HIPAA;

  return null;
}

function useVendorResearchData(riskAssessmentData?: Prisma.InputJsonValue | null) {
  return useMemo(() => {
    if (!riskAssessmentData) return { certifications: [], links: [] };
    const data = parseVendorRiskAssessmentDescription(
      typeof riskAssessmentData === 'string'
        ? riskAssessmentData
        : JSON.stringify(riskAssessmentData),
    );
    return {
      certifications: filterCertifications(data?.certifications).filter(
        (cert) => cert.status === 'verified',
      ),
      links: data?.links ?? [],
    };
  }, [riskAssessmentData]);
}

interface VendorResearchProps {
  riskAssessmentData?: Prisma.InputJsonValue | null;
}

export function VendorResearchBadges({ riskAssessmentData }: VendorResearchProps) {
  const { certifications } = useVendorResearchData(riskAssessmentData);

  if (certifications.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {certifications.map((cert, index) => {
        const IconComponent = getCertificationIcon(cert);
        if (!IconComponent) return null;

        const iconContent = (
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'transition-all duration-200 ease-out',
              'w-[32px] h-[36px] shrink-0 overflow-hidden',
              cert.url && 'cursor-pointer hover:scale-105 active:scale-95',
            )}
            title={cert.type}
          >
            <IconComponent className="h-[32px] w-[32px] max-h-[32px] max-w-[32px]" />
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
  );
}

export function VendorResearchLinks({ riskAssessmentData }: VendorResearchProps) {
  const { links } = useVendorResearchData(riskAssessmentData);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
      {links.map((link, index) => (
        <Button
          key={`${link.url}-${link.label}-${index}`}
          variant="link"
          size="sm"
          render={
            <Link
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          {link.label}
          <Launch className="size-3" />
        </Button>
      ))}
    </div>
  );
}
