'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle, Collapsible, CollapsibleContent, CollapsibleTrigger, Stack, Text } from '@trycompai/design-system';
import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';
import { format, isValid } from 'date-fns';
import { useMemo, useState } from 'react';
import type { VendorRiskAssessmentNewsItem } from './vendor-risk-assessment-types';

function formatLongDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(d)) return '—';
  return format(d, 'MMMM d, yyyy');
}

function NewsRow({ item }: { item: VendorRiskAssessmentNewsItem }) {
  return (
    <div className="space-y-1">
      <Badge variant="secondary">{formatLongDate(item.date)}</Badge>
      <div className="text-sm text-foreground leading-relaxed">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-normal underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
          >
            {item.title}
          </a>
        ) : (
          <span className="font-normal">{item.title}</span>
        )}
        {item.summary && (
          <> — <span className="text-muted-foreground">{item.summary}</span></>
        )}
        {item.source && (
          <> <span className="text-muted-foreground">({item.source})</span></>
        )}
      </div>
    </div>
  );
}

export function VendorRiskAssessmentTimelineCard({
  news,
  previewCount = 3,
  flat = false,
}: {
  news: VendorRiskAssessmentNewsItem[];
  previewCount?: number;
  flat?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const preview = useMemo(() => news.slice(0, previewCount), [news, previewCount]);
  const rest = useMemo(() => news.slice(previewCount), [news, previewCount]);

  const content = news.length === 0 ? (
    <Text size="sm" variant="muted">No recent news items were captured yet.</Text>
  ) : (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="relative">
        <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border/50" />
        <div className="space-y-3">
          {preview.map((item, index) => (
            <div key={`${item.date}-${item.title}-${index}`} className="relative pl-5">
              <div className="absolute left-0 top-[7px] z-10 h-[7px] w-[7px] rounded-full bg-muted-foreground/40" />
              <NewsRow item={item} />
            </div>
          ))}

          {rest.length > 0 && (
            <CollapsibleContent className="space-y-3">
              {rest.map((item, index) => (
                <div key={`${item.date}-${item.title}-${previewCount + index}`} className="relative pl-5">
                  <div className="absolute left-0 top-[7px] z-10 h-[7px] w-[7px] rounded-full bg-muted-foreground/40" />
                  <NewsRow item={item} />
                </div>
              ))}
            </CollapsibleContent>
          )}
        </div>
      </div>

      {rest.length > 0 && (
        <div className="pt-1">
          <CollapsibleTrigger
            render={<button type="button" />}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? (
              <>
                <span>Show less</span>
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                <span>Show {rest.length} more</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </CollapsibleTrigger>
        </div>
      )}
    </Collapsible>
  );

  if (flat) {
    return (
      <Stack gap="sm">
        <Text size="lg" weight="semibold">Timeline</Text>
        {content}
      </Stack>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Text size="lg" weight="semibold">Timeline</Text>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
