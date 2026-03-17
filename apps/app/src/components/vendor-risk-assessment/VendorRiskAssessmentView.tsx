'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@trycompai/design-system';
import { Launch, Security } from '@trycompai/design-system/icons';
import { useMemo } from 'react';
import { parseVendorRiskAssessmentDescription } from './parse-vendor-risk-assessment-description';
import { filterCertifications } from './filter-certifications';
import { VendorRiskAssessmentCertificationsCard } from './VendorRiskAssessmentCertificationsCard';
import { VendorRiskAssessmentTimelineCard } from './VendorRiskAssessmentTimelineCard';
import { SecurityAssessmentContent } from './SecurityAssessmentContent';

export type VendorRiskAssessmentViewSource = {
  title: string;
  description: string | null | undefined;
  createdAt: string;
  entityType?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
};

export function VendorRiskAssessmentView({ source }: { source: VendorRiskAssessmentViewSource }) {
  const data = useMemo(() => {
    return parseVendorRiskAssessmentDescription(source.description);
  }, [source.description]);

  const certifications = data?.certifications ?? [];
  const filteredCerts = useMemo(() => filterCertifications(certifications), [certifications]);
  const verifiedCount = useMemo(
    () => filteredCerts.filter((c) => c.status === 'verified').length,
    [filteredCerts],
  );
  const links = data?.links ?? [];
  const news = data?.news ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Security size={16} />
              Security Assessment
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.securityAssessment ? (
            <SecurityAssessmentContent
              text={
                data.securityAssessment.includes('Framework-specific checks:')
                  ? data.securityAssessment.split('Framework-specific checks:')[0].trim()
                  : data.securityAssessment
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No automated security assessment found.
            </p>
          )}
        </CardContent>
      </Card>

      {certifications.length > 0 && (
        <VendorRiskAssessmentCertificationsCard
          certifications={certifications}
          verifiedCount={verifiedCount}
        />
      )}

      {links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="text-sm font-semibold">Links</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {links.map((link, index) => (
                <Button
                  key={`${link.url}-${link.label}-${index}`}
                  variant="outline"
                  size="sm"
                  iconRight={<Launch size={12} />}
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                >
                  {link.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <VendorRiskAssessmentTimelineCard news={news} />
    </div>
  );
}


