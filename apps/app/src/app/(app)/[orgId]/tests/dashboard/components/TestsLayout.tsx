'use client';

import { Integration } from '@comp/db/types';
import { Button } from '@comp/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { runTests } from '../actions/run-tests';
import { TestCard } from './TestCard';

// Define props for the reusable component
interface TestProviderTabContentProps {
  tests: {
    id: string;
    title: string | null;
    description: string | null;
    remediation: string | null;
    status: string | null;
    severity: string | null;
    completedAt: Date | null;
    integration: {
      integrationId: string;
    };
  }[];
  providerName: string;
  handleRunTests?: () => Promise<void>;
  executing?: boolean;
  isSingleProviderView: boolean;
  mainTitle?: string;
  timeToNextRunInfo?: string;
}

interface TestsLayoutProps {
  awsTests: TestProviderTabContentProps['tests'];
  gcpTests: TestProviderTabContentProps['tests'];
  azureTests: TestProviderTabContentProps['tests'];
  cloudProviders: Integration[];
}

export const TestsLayout = ({
  awsTests,
  gcpTests,
  azureTests,
  cloudProviders,
}: TestsLayoutProps) => {
  const [executing, setExecuting] = useState(false);
  const [timeToNextRun, setTimeToNextRun] = useState('');

  useEffect(() => {
    const calculateTimeToNextRun = () => {
      const now = new Date();
      const nextRunUTC = new Date();
      nextRunUTC.setUTCHours(5, 0, 0, 0); // Set to 5:00 AM UTC today

      if (now.getTime() > nextRunUTC.getTime()) {
        // If 5:00 AM UTC today has passed, set to 5:00 AM UTC tomorrow
        nextRunUTC.setDate(nextRunUTC.getDate() + 1);
      }

      const diff = nextRunUTC.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeToNextRun(`Next scheduled run in ${hours}h ${minutes}m (daily at 5:00 AM UTC)`);
    };

    calculateTimeToNextRun(); // Initial calculation
    const intervalId = setInterval(calculateTimeToNextRun, 60000); // Update every minute

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  const hasAws = cloudProviders.some((integration) => integration.integrationId === 'aws');
  const hasGcp = cloudProviders.some((integration) => integration.integrationId === 'gcp');
  const hasAzure = cloudProviders.some((integration) => integration.integrationId === 'azure');

  const activeProvidersCount = [hasAws, hasGcp, hasAzure].filter(Boolean).length;

  const handleRunTests = async () => {
    try {
      setExecuting(true);
      await runTests();
    } catch (error) {
      console.error(error);
      toast.error('Failed to run tests, please try again later or contact support.');
    } finally {
      setExecuting(false);
    }
  };

  const renderProviderContent = () => {
    if (activeProvidersCount === 1) {
      if (hasAws) {
        return (
          <TestProviderTabContent
            tests={awsTests}
            providerName="AWS"
            handleRunTests={handleRunTests}
            executing={executing}
            isSingleProviderView={true}
            mainTitle="Cloud Tests Results"
            timeToNextRunInfo={timeToNextRun}
          />
        );
      }
      if (hasGcp) {
        return (
          <TestProviderTabContent
            tests={gcpTests}
            providerName="GCP"
            handleRunTests={handleRunTests}
            executing={executing}
            isSingleProviderView={true}
            mainTitle="Cloud Tests Results"
            timeToNextRunInfo={timeToNextRun}
          />
        );
      }
      if (hasAzure) {
        return (
          <TestProviderTabContent
            tests={azureTests}
            providerName="Azure"
            handleRunTests={handleRunTests}
            executing={executing}
            isSingleProviderView={true}
            mainTitle="Cloud Tests Results"
            timeToNextRunInfo={timeToNextRun}
          />
        );
      }
    }
    return null; // Should not happen if activeProvidersCount is 1
  };

  return (
    <div className="container mx-auto flex w-full flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Main header: Only shown if there are multiple providers (tabs) */}
      {activeProvidersCount > 1 && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cloud Tests Results</h1>
            {timeToNextRun && <p className="text-muted-foreground mt-1 text-xs">{timeToNextRun}</p>}
          </div>
          <div className="flex flex-col items-end">
            <Button onClick={() => handleRunTests()} disabled={executing}>
              Run Tests Again{' '}
              <RefreshCw className={`ml-2 h-4 w-4 ${executing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      )}

      {activeProvidersCount > 1 ? (
        <Tabs defaultValue={hasAws ? 'AWS' : hasGcp ? 'GCP' : 'Azure'}>
          <TabsList className={`grid w-full grid-cols-${activeProvidersCount}`}>
            {hasAws && <TabsTrigger value="AWS">AWS</TabsTrigger>}
            {hasGcp && <TabsTrigger value="GCP">GCP</TabsTrigger>}
            {hasAzure && <TabsTrigger value="Azure">Azure</TabsTrigger>}
          </TabsList>
          {hasAws && (
            <TabsContent value="AWS" className="mt-4">
              <TestProviderTabContent
                tests={awsTests}
                providerName="AWS"
                isSingleProviderView={false}
              />
            </TabsContent>
          )}
          {hasGcp && (
            <TabsContent value="GCP" className="mt-4">
              <TestProviderTabContent
                tests={gcpTests}
                providerName="GCP"
                isSingleProviderView={false}
              />
            </TabsContent>
          )}
          {hasAzure && (
            <TabsContent value="Azure" className="mt-4">
              <TestProviderTabContent
                tests={azureTests}
                providerName="Azure"
                isSingleProviderView={false}
              />
            </TabsContent>
          )}
        </Tabs>
      ) : activeProvidersCount === 1 ? (
        <div className="mt-4">{renderProviderContent()}</div>
      ) : (
        <div className="text-muted-foreground mt-4 rounded-lg border border-dashed p-10 text-center">
          <p>No cloud providers configured. Please add an integration.</p>
        </div>
      )}
    </div>
  );
};

function TestProviderTabContent({
  tests,
  providerName,
  handleRunTests,
  executing,
  isSingleProviderView,
  mainTitle,
  timeToNextRunInfo,
}: TestProviderTabContentProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const uniqueStatuses = Array.from(
    new Set(tests.map((test) => test.status).filter(Boolean) as string[]),
  );

  const filteredTests = tests.filter((test) => {
    if (selectedStatus === 'all') return true;
    return test.status === selectedStatus;
  });

  const sortedTests = [...filteredTests].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityA = a.severity
      ? (severityOrder[a.severity.toLowerCase() as keyof typeof severityOrder] ?? 999)
      : 999;
    const severityB = b.severity
      ? (severityOrder[b.severity.toLowerCase() as keyof typeof severityOrder] ?? 999)
      : 999;
    return severityA - severityB;
  });

  const showFilter = sortedTests.length > 0;
  const showRunButton = isSingleProviderView && handleRunTests && typeof executing === 'boolean';

  return (
    <div className="flex flex-col gap-4">
      {(isSingleProviderView || showFilter) && (
        <div className="flex items-center justify-between gap-2">
          {/* Left side: Title and Countdown (only for single provider view) */}
          {isSingleProviderView && mainTitle && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{mainTitle}</h1>
              {timeToNextRunInfo && (
                <p className="text-muted-foreground mt-1 text-xs">{timeToNextRunInfo}</p>
              )}
            </div>
          )}
          {/* Spacer if only filter is shown in tab view and no title from single view */}
          {!isSingleProviderView && showFilter && <div />}

          {/* Right side: Filter and/or Button */}
          {(showFilter || showRunButton) && (
            <div className="flex items-center gap-2">
              {showFilter && (
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-background w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {showRunButton && (
                <Button onClick={handleRunTests!} disabled={executing!}>
                  Run Tests Again{' '}
                  <RefreshCw className={`ml-2 h-4 w-4 ${executing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {sortedTests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedTests.map((test) => {
            return <TestCard key={test.id} test={test} />;
          })}
        </div>
      ) : (
        <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center">
          <p>
            No {providerName} test results found
            {selectedStatus !== 'all' && ` with status "${selectedStatus}"`}
          </p>
        </div>
      )}
    </div>
  );
}
