'use client';

import { Button } from '@trycompai/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@trycompai/ui/card';
import { ScrollArea } from '@trycompai/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/ui/tabs';
import { Finding, FindingStatus } from '@db';
import { ArrowRight, CheckCircle2, FileWarning } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

interface FindingWithTask extends Finding {
  task: {
    id: string;
    title: string;
  } | null;
  evidenceSubmission: {
    id: string;
    formType: string;
  } | null;
}

function FindingsList({
  findings,
  organizationId,
}: {
  findings: FindingWithTask[];
  organizationId: string;
}) {
  return (
    <div className="h-[300px]">
      <ScrollArea className="h-full">
        <div className="space-y-0 pr-4">
          {findings.map((finding, index) => (
            <div key={finding.id}>
              <div className="flex items-start justify-between py-3 px-1">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full shrink-0">
                    <FileWarning className="h-3 w-3" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground line-clamp-1">
                      {finding.task?.title ??
                        (finding.evidenceFormType
                          ? `Document: ${finding.evidenceFormType.replace(/-/g, ' ')}`
                          : finding.evidenceSubmission
                            ? `Document: ${finding.evidenceSubmission.formType.replace(/-/g, ' ')}`
                            : 'Finding')}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {finding.content}
                    </p>
                  </div>
                </div>
                <Button asChild size="icon" variant="outline" className="shrink-0 ml-2">
                  <Link
                    href={
                      finding.task
                        ? `/${organizationId}/tasks/${finding.task.id}?tab=findings`
                        : finding.evidenceFormType
                          ? `/${organizationId}/documents/${finding.evidenceFormType}?tab=findings`
                          : finding.evidenceSubmission
                            ? `/${organizationId}/documents/${finding.evidenceSubmission.formType}?tab=findings`
                            : `/${organizationId}/overview`
                    }
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              {index < findings.length - 1 && <div className="border-t border-muted/30" />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function FindingsOverview({
  findings,
  organizationId,
}: {
  findings: FindingWithTask[];
  organizationId: string;
}) {
  const openFindings = useMemo(() => {
    return [...findings]
      .filter((f) => f.status !== FindingStatus.closed)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [findings]);

  const closedFindings = useMemo(() => {
    return [...findings]
      .filter((f) => f.status === FindingStatus.closed)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [findings]);

  const closedCount = closedFindings.length;
  const totalCount = findings.length;
  const progressWidth = totalCount > 0 ? (closedCount / totalCount) * 100 : 100;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">Findings</CardTitle>
        </div>

        <div className="bg-secondary/50 relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${progressWidth}%`,
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Tabs defaultValue={openFindings.length > 0 ? 'open' : 'closed'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="open" className="flex items-center gap-2">
              <FileWarning className="h-3 w-3" />
              Open ({openFindings.length})
            </TabsTrigger>
            <TabsTrigger value="closed" className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Closed ({closedFindings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-4">
            {openFindings.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent p-3">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">No open findings</span>
              </div>
            ) : (
              <FindingsList findings={openFindings} organizationId={organizationId} />
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-4">
            {closedFindings.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent p-3">
                <span className="text-sm text-muted-foreground">No closed findings</span>
              </div>
            ) : (
              <FindingsList findings={closedFindings} organizationId={organizationId} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
