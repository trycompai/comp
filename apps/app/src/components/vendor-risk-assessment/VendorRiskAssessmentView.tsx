'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Shield } from 'lucide-react';
import { useMemo } from 'react';
import { parseVendorRiskAssessmentDescription } from './parse-vendor-risk-assessment-description';
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

  const links = data?.links ?? [];
  const news = data?.news ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Assessment
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

        <VendorRiskAssessmentTimelineCard news={news} />
      </div>
    </div>
  );
}


