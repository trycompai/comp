'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comp/ui/collapsible';
import { ExternalLink, ChevronDown, ChevronUp, ShieldCheck, Shield, XCircle, Clock, Calendar } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useMemo, useState } from 'react';
import type { VendorRiskAssessmentCertification } from './vendor-risk-assessment-types';

function formatLongDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(d)) return '—';
  return format(d, 'MMM yyyy');
}

function CertificationRow({ cert }: { cert: VendorRiskAssessmentCertification }) {
  const statusIcon =
    cert.status === 'verified' ? (
      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
    ) : cert.status === 'expired' ? (
      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
    ) : cert.status === 'not_certified' ? (
      <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
    ) : (
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
    );

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {statusIcon}
          <p className="text-sm font-medium truncate">{cert.type}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {cert.status === 'verified' && (
            <Badge variant="default" className="text-[10px] h-4 px-1 py-0 leading-none">
              verified
            </Badge>
          )}
          {cert.status === 'expired' && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1 py-0 leading-none">
              expired
            </Badge>
          )}
          {cert.status === 'not_certified' && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 leading-none">
              not certified
            </Badge>
          )}
          {cert.url ? (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={() => window.open(cert.url ?? undefined, '_blank', 'noopener,noreferrer')}
              aria-label="Open certification link"
            >
              <ExternalLink className="h-4 w-4" />
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

  const preview = useMemo(
    () => certifications.slice(0, previewCount),
    [certifications, previewCount],
  );
  const rest = useMemo(
    () => certifications.slice(previewCount),
    [certifications, previewCount],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Certifications
          </div>
          {certifications.length > 0 ? (
            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 leading-none">
              {verifiedCount} verified
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {certifications.length === 0 ? (
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
                    <CertificationRow key={`${cert.type}-${cert.status}-${previewCount + index}`} cert={cert} />
                  ))}
                </CollapsibleContent>
              ) : null}
            </div>

            {rest.length > 0 ? (
              <div className="pt-1">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {open ? (
                      <>
                        <span>Show less</span>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Show {rest.length} more</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>
              </div>
            ) : null}
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}


