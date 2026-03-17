'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@trycompai/design-system';
import { CheckmarkFilled, ChevronDown, ChevronUp, CloseOutline, Launch, Security, Time } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import { filterCertifications } from './filter-certifications';
import type { VendorRiskAssessmentCertification } from './vendor-risk-assessment-types';

function CertificationRow({ cert }: { cert: VendorRiskAssessmentCertification }) {
  const statusIcon =
    cert.status === 'verified' ? (
      <div className="text-primary shrink-0"><CheckmarkFilled size={16} /></div>
    ) : cert.status === 'expired' ? (
      <div className="text-red-600 dark:text-red-400 shrink-0"><CloseOutline size={16} /></div>
    ) : cert.status === 'not_certified' ? (
      <div className="text-muted-foreground shrink-0"><CloseOutline size={16} /></div>
    ) : (
      <div className="text-muted-foreground shrink-0"><Time size={16} /></div>
    );

  const statusBadge =
    cert.status === 'verified' ? (
      <Badge variant="default">verified</Badge>
    ) : cert.status === 'expired' ? (
      <Badge variant="destructive">expired</Badge>
    ) : cert.status === 'not_certified' ? (
      <Badge variant="outline">not certified</Badge>
    ) : null;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {statusIcon}
          <p className="text-sm font-medium truncate">{cert.type}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge}
          {cert.url ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(cert.url ?? undefined, '_blank', 'noopener,noreferrer')}
              aria-label="Open certification link"
            >
              <Launch size={16} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function VendorRiskAssessmentCertificationsCard({
  certifications,
  verifiedCount,
  previewCount = 4,
}: {
  certifications: VendorRiskAssessmentCertification[];
  verifiedCount: number;
  previewCount?: number;
}) {
  const [open, setOpen] = useState(false);

  // Filter to only show specific certifications
  const filteredCerts = useMemo(() => filterCertifications(certifications), [certifications]);
  const filteredVerifiedCount = useMemo(
    () => filteredCerts.filter((c) => c.status === 'verified').length,
    [filteredCerts],
  );

  const preview = useMemo(() => filteredCerts.slice(0, previewCount), [filteredCerts, previewCount]);
  const rest = useMemo(() => filteredCerts.slice(previewCount), [filteredCerts, previewCount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Security size={16} />
              Certifications
            </div>
            {filteredCerts.length > 0 ? (
              <Badge variant="outline">{filteredVerifiedCount} verified</Badge>
            ) : null}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredCerts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No certifications found.</p>
        ) : (
          <Collapsible open={open} onOpenChange={setOpen}>
            <div className="space-y-3">
              {preview.map((cert, index) => (
                <CertificationRow key={`${cert.type}-${cert.status}-${index}`} cert={cert} />
              ))}

              {rest.length > 0 ? (
                <CollapsibleContent className="space-y-3">
                  {rest.map((cert, index) => (
                    <CertificationRow
                      key={`${cert.type}-${cert.status}-${previewCount + index}`}
                      cert={cert}
                    />
                  ))}
                </CollapsibleContent>
              ) : null}
            </div>

            {rest.length > 0 ? (
              <div className="pt-1">
                <CollapsibleTrigger
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {open ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      <span>Show {rest.length} more</span>
                      <ChevronDown size={14} />
                    </>
                  )}
                </CollapsibleTrigger>
              </div>
            ) : null}
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}


