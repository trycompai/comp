'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comp/ui/collapsible';
import { Separator } from '@comp/ui/separator';
import { ExternalLink, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useMemo, useState } from 'react';
import type { VendorRiskAssessmentNewsItem } from './vendor-risk-assessment-types';

function formatLongDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(d)) return '—';
  return format(d, 'MMM d, yyyy');
}

function NewsRow({ item }: { item: VendorRiskAssessmentNewsItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{formatLongDate(item.date)}</Badge>
        {item.source ? <span className="text-xs text-muted-foreground">{item.source}</span> : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          {item.summary ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
          ) : null}
        </div>

        {item.url ? (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => window.open(item.url ?? undefined, '_blank', 'noopener,noreferrer')}
            aria-label="Open source link"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function VendorRiskAssessmentTimelineCard({
  news,
  previewCount = 3,
}: {
  news: VendorRiskAssessmentNewsItem[];
  previewCount?: number;
}) {
  const [open, setOpen] = useState(false);

  const preview = useMemo(() => news.slice(0, previewCount), [news, previewCount]);
  const rest = useMemo(() => news.slice(previewCount), [news, previewCount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {news.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No recent news items were captured yet.</p>
        ) : (
          <Collapsible open={open} onOpenChange={setOpen}>
            <div className="space-y-5">
              {preview.map((item, index) => (
                <div key={`${item.date}-${item.title}-${index}`} className="space-y-2">
                  <NewsRow item={item} />
                  <Separator />
                </div>
              ))}

              {rest.length > 0 ? (
                <CollapsibleContent className="space-y-5">
                  {rest.map((item, index) => (
                    <div key={`${item.date}-${item.title}-${previewCount + index}`} className="space-y-2">
                      <NewsRow item={item} />
                      <Separator />
                    </div>
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


