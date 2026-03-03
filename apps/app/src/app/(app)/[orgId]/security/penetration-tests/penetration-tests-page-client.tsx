'use client';

import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@comp/ui/table';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { formatReportDate, isReportInProgress, statusLabel, statusVariant } from './lib';
import {
  useCreatePenetrationTest,
  useGithubRepos,
  usePenetrationTests,
} from './hooks/use-penetration-tests';
import {
  useIntegrationConnections,
  useIntegrationMutations,
} from '@/hooks/use-integration-platform';
import { Button, PageHeader, PageLayout } from '@trycompai/design-system';

interface PenetrationTestsPageClientProps {
  orgId: string;
}

const hasProtocol = (value: string): boolean => /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value);

const normalizeTargetUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = hasProtocol(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    new URL(normalized);
    return normalized;
  } catch {
    return null;
  }
};

export function PenetrationTestsPageClient({ orgId }: PenetrationTestsPageClientProps) {
  const router = useRouter();

  const [showNewRunDialog, setShowNewRunDialog] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);

  const { reports, isLoading, activeReports, completedReports } =
    usePenetrationTests(orgId);

  const { repos: githubRepos } = useGithubRepos(orgId);

  const { connections } = useIntegrationConnections();
  const githubConnected = connections.some(
    (c) => c.providerSlug === 'github' && c.status === 'active',
  );
  const { startOAuth } = useIntegrationMutations();

  const {
    createReport,
    isCreating,
  } = useCreatePenetrationTest(orgId);

  const handleConnectGithub = async () => {
    setIsConnectingGithub(true);
    const result = await startOAuth('github', window.location.href);
    if (result.authorizationUrl) {
      window.location.href = result.authorizationUrl;
    } else {
      toast.error(result.error ?? 'Failed to start GitHub connection');
      setIsConnectingGithub(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTargetUrl = targetUrl.trim();
    if (!trimmedTargetUrl) {
      toast.error('Target URL is required');
      return;
    }
    const normalizedTargetUrl = normalizeTargetUrl(trimmedTargetUrl);
    if (!normalizedTargetUrl) {
      toast.error('Enter a valid target URL');
      return;
    }

    try {
      const response = await createReport({
        targetUrl: normalizedTargetUrl,
        repoUrl: repoUrl.trim() || undefined,
      });

      setTargetUrl('');
      setRepoUrl('');
      setShowNewRunDialog(false);
      toast.success('Penetration test queued successfully.');
      router.push(`/${orgId}/security/penetration-tests/${response.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not queue a new report');
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title="Penetration Tests"
        actions={
          <Button onClick={() => setShowNewRunDialog(true)}>Create Report</Button>
        }
      >
        Run penetration tests with Maced and review generated reports.{' '}
        <a
          href={`/${orgId}/settings/billing`}
          className="text-primary underline text-sm"
        >
          Manage subscription
        </a>
      </PageHeader>

      <Dialog open={showNewRunDialog} onOpenChange={setShowNewRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Queue a penetration test</DialogTitle>
            <DialogDescription>
              Your subscription includes 3 penetration test runs per month. Additional runs are
              charged as overage immediately.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="targetUrl">Target URL</Label>
              <Input
                id="targetUrl"
                value={targetUrl}
                placeholder="https://example.com"
                onChange={(event) => setTargetUrl(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="repoUrl">Repository URL</Label>
              {githubConnected ? (
                <Select value={repoUrl} onValueChange={setRepoUrl}>
                  <SelectTrigger id="repoUrl">
                    <SelectValue placeholder="Select a repository (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {githubRepos.map((repo) => (
                      <SelectItem key={repo.id} value={repo.htmlUrl}>
                        {repo.fullName}
                        {repo.private ? ' (private)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="repoUrl"
                  value={repoUrl}
                  placeholder="https://github.com/org/repo"
                  onChange={(event) => setRepoUrl(event.target.value)}
                />
              )}
              {githubConnected && (
                <Input
                  className="mt-1"
                  value={githubRepos.some((r) => r.htmlUrl === repoUrl) ? '' : repoUrl}
                  placeholder="or paste URL manually"
                  onChange={(event) => setRepoUrl(event.target.value)}
                />
              )}
              {githubConnected ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional. Leave blank to run a black-box scan.
                </p>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Optional. Connect GitHub to select from your repos.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleConnectGithub}
                    disabled={isConnectingGithub}
                  >
                    {isConnectingGithub ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect GitHub'
                    )}
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowNewRunDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start penetration test'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Your reports ({reports.length})</CardTitle>
          <CardDescription>
            {activeReports.length > 0
              ? `${activeReports.length} report${activeReports.length === 1 ? '' : 's'} in progress`
              : completedReports.length > 0
                ? `${completedReports.length} completed report${completedReports.length === 1 ? '' : 's'}`
                : 'No reports yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-12 text-center">
              <AlertCircle className="text-muted-foreground mx-auto mb-4 h-8 w-8" />
              <p className="text-lg font-medium text-foreground">No reports yet</p>
              <p className="text-muted-foreground text-sm">
                Create your first penetration test to get started.
              </p>
              <div className="mt-4">
                <Button onClick={() => setShowNewRunDialog(true)}>
                  Create your first report
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Repository</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Last update</TableHead>
                  <TableHead className="w-[300px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-xs break-all">{report.targetUrl}</TableCell>
                    <TableCell className="font-mono text-xs break-all">{report.repoUrl || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[report.status]}>{statusLabel[report.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {report.progress ? (
                        <span className="text-sm text-muted-foreground">
                          {`In progress${typeof report.progress.completedAgents === 'number' && typeof report.progress.totalAgents === 'number' ? ` (${report.progress.completedAgents}/${report.progress.totalAgents})` : ''}`}
                        </span>
                      ) : isReportInProgress(report.status) ? (
                        <span className="text-sm text-muted-foreground">In queue</span>
                      ) : report.status === 'failed' ? (
                        <span className="text-sm text-destructive">
                          {report.failedReason ?? report.error ?? 'Run failed'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatReportDate(report.updatedAt)}</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/${orgId}/security/penetration-tests/${report.id}`)}
                      >
                        View output
                      </Button>
                      {report.status === 'completed' ? (
                        <span className="text-sm text-muted-foreground">Ready</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
