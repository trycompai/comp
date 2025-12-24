'use client';

import type { TaskItem } from '@/hooks/use-task-items';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comp/ui/collapsible';
import { ExternalLink, FileText, ShieldCheck, Clock, TrendingDown, TrendingUp, Link2, ChevronDown, ChevronUp, Shield, Lock, FileCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format, isValid } from 'date-fns';
import { parseVendorRiskAssessmentDescription } from './parse-vendor-risk-assessment-description';
import type { VendorRiskAssessmentDataV1, VendorRiskAssessmentNewsItem } from './vendor-risk-assessment-types';
import { VendorRiskAssessmentTimelineCard } from './VendorRiskAssessmentTimelineCard';
import { VendorRiskAssessmentCertificationsCard } from './VendorRiskAssessmentCertificationsCard';

function formatLongDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(d)) return '—';
  return format(d, 'MMM d, yyyy');
}

function SecurityAssessmentContent({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 500; // Characters to show before "Show more"
  const isLong = text.length > maxLength;
  const preview = isLong ? text.slice(0, maxLength) : text;
  const rest = isLong ? text.slice(maxLength) : '';

  if (!isLong) {
    return <p className="text-sm text-foreground/90 leading-7">{text}</p>;
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="relative">
        <div className={isExpanded ? '' : 'max-h-48 overflow-hidden transition-all duration-300 ease-in-out'}>
          <p className="text-sm text-foreground/90 leading-7">
            {preview}
            {!isExpanded && rest && '...'}
          </p>
        </div>
        <div
          className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none transition-opacity duration-300 ease-in-out ${
            isExpanded ? 'opacity-0' : 'opacity-100'
          }`}
        />
        {isExpanded && (
          <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm text-foreground/90 leading-7 mt-0">{rest}</p>
          </CollapsibleContent>
        )}
      </div>
      <div className="pt-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out" />
              </>
            ) : (
              <>
                <span>Show more</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out" />
              </>
            )}
          </button>
        </CollapsibleTrigger>
      </div>
    </Collapsible>
  );
}

function getSentimentCounts(news: VendorRiskAssessmentNewsItem[] | null | undefined): {
  positive: number;
  negative: number;
  neutral: number;
} {
  const items = news ?? [];
  return items.reduce(
    (acc, item) => {
      const s = item.sentiment ?? 'neutral';
      if (s === 'positive') acc.positive += 1;
      else if (s === 'negative') acc.negative += 1;
      else acc.neutral += 1;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 },
  );
}

function getVerifiedCounts(data: VendorRiskAssessmentDataV1 | null) {
  const certs = data?.certifications ?? [];
  const total = certs?.length ?? 0;
  const verified = certs?.filter((c) => c.status === 'verified').length ?? 0;
  return { verified, total };
}

function getLinkIcon(label: string) {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes('trust') || normalizedLabel.includes('security')) {
    return Shield;
  }
  if (normalizedLabel.includes('soc') || normalizedLabel.includes('report')) {
    return FileCheck;
  }
  if (normalizedLabel.includes('privacy')) {
    return Lock;
  }
  if (normalizedLabel.includes('terms') || normalizedLabel.includes('service')) {
    return FileText;
  }
  return Link2;
}

export function VendorRiskAssessmentTaskItemView({ taskItem }: { taskItem: TaskItem }) {
  const data = useMemo(() => {
    return parseVendorRiskAssessmentDescription(taskItem.description);
  }, [taskItem.description]);

  const { verified, total } = useMemo(() => getVerifiedCounts(data), [data]);
  const sentiment = useMemo(() => getSentimentCounts(data?.news), [data?.news]);

  const links = data?.links ?? [];
  const certs = data?.certifications ?? [];
  const news = data?.news ?? [];

  const vendorName =
    data?.vendorName ?? (taskItem.entityType === 'vendor' ? 'Vendor' : '—');

  const addedBy =
    taskItem.createdBy?.user?.name ||
    taskItem.createdBy?.user?.email ||
    'Unknown';

  const lastResearched = data?.lastResearchedAt ?? taskItem.createdAt;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{taskItem.title}</h2>
        <p className="text-sm text-muted-foreground">
          Automated vendor research summary for <span className="font-medium text-foreground">{vendorName}</span>
        </p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold">{data?.riskLevel ?? '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold tabular-nums">
                {total > 0 ? `${verified}/${total}` : '—'}
              </div>
              <div className="h-8 w-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">News Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              {news.length > 0 ? (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="font-bold">{sentiment.positive}</span>
                  </div>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span className="font-bold">{sentiment.negative}</span>
                  </div>
                </div>
              ) : (
                <div className="text-base font-semibold">—</div>
              )}
              <div className="h-8 w-8 shrink-0 rounded-md bg-blue-50 dark:bg-blue-250/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-250" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Researched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold">{formatLongDate(lastResearched)}</div>
              <div className="h-8 w-8 shrink-0 rounded-md bg-muted flex items-center justify-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Useful Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No links found.</p>
              ) : (
                links.map((link) => {
                  const LinkIcon = getLinkIcon(link.label);
                  return (
                  <Button
                    key={link.url}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                  >
                      <div className="flex items-center gap-2 min-w-0">
                        <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{link.label}</span>
                      </div>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </Button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <VendorRiskAssessmentCertificationsCard
            certifications={certs}
            verifiedCount={verified}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Added by</span>
                <span className="text-sm font-medium text-foreground truncate">{addedBy}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Added on</span>
                <span className="text-sm font-medium text-foreground">
                  {formatLongDate(taskItem.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


