'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import { SOAFrameworkTable } from './SOAFrameworkTable';
import { api } from '@/lib/api-client';
import type { FrameworkWithSOAData } from '../types';

interface SOAFrameworkTabsProps {
  frameworksWithSOAData: FrameworkWithSOAData[];
  organizationId: string;
}

const isFrameworkSupported = (frameworkName: string) => {
  return ['ISO 27001', 'iso27001', 'ISO27001'].includes(frameworkName);
};

export function SOAFrameworkTabs({ frameworksWithSOAData, organizationId }: SOAFrameworkTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [frameworkData, setFrameworkData] = useState<Map<string, typeof frameworksWithSOAData[0]>>(
    new Map(frameworksWithSOAData.map((fw) => [fw.frameworkId, fw]))
  );

  // Set active tab to first supported framework with data, or first framework
  const getInitialTab = () => {
    const firstSupportedWithData = frameworksWithSOAData.find((fw) => {
      if (!fw.framework) return false;
      const isSupported = isFrameworkSupported(fw.framework.name);
      return isSupported && fw.configuration && fw.document;
    });
    
    if (firstSupportedWithData) {
      return firstSupportedWithData.frameworkId;
    }
    
    return frameworksWithSOAData[0]?.frameworkId || '';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  const handleTabChange = async (frameworkId: string) => {
    const currentData = frameworkData.get(frameworkId);
    
    // If we already have configuration and document, just switch tabs
    if (currentData?.configuration && currentData?.document) {
      setActiveTab(frameworkId);
      return;
    }

    setActiveTab(frameworkId);
    setLoadingTab(frameworkId);

    startTransition(async () => {
      try {
        const response = await api.post<{
          success: boolean;
          configuration?: FrameworkWithSOAData['configuration'] | null;
          document?: FrameworkWithSOAData['document'] | null;
          error?: string;
        }>(
          '/v1/soa/ensure-setup',
          {
            frameworkId,
            organizationId,
          },
          organizationId,
        );

        if (response.error) {
          toast.error(response.error || 'Failed to setup SOA');
        } else if (response.data?.success) {
          // Update framework data
          const existingData = frameworkData.get(frameworkId);
          if (existingData) {
            setFrameworkData((prev) => {
              const newMap = new Map(prev);
              newMap.set(frameworkId, {
                ...existingData,
                configuration: (response.data?.configuration ?? null) as FrameworkWithSOAData['configuration'],
                document: (response.data?.document ?? null) as FrameworkWithSOAData['document'],
              });
              return newMap;
            });
          }
        } else if (response.data?.error) {
          toast.error(response.data.error);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to setup SOA');
      } finally {
        setLoadingTab(null);
        router.refresh();
      }
    });
  };

  if (frameworksWithSOAData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center rounded-lg border">
        <p className="text-muted-foreground">
          No frameworks found. Add ISO 27001 framework to get started.
        </p>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-full gap-1">
        {frameworksWithSOAData.map((fw) => {
          if (!fw.framework) return null;
          const isSupported = isFrameworkSupported(fw.framework.name);
          const isLoading = loadingTab === fw.frameworkId;
          
          return (
            <TabsTrigger 
              key={fw.frameworkId} 
              value={fw.frameworkId} 
              disabled={isLoading}
              className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                isSupported 
                  ? 'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-green-200 dark:border-green-900/30' 
                  : 'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{fw.framework.name}</span>
                </>
              ) : (
                <>
                  {isSupported && (
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  )}
                  <span>{fw.framework.name}</span>
                  {isSupported && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
                      SOA
                    </span>
                  )}
                </>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {frameworksWithSOAData.map((fw) => {
        if (!fw.framework) return null;
        const data = frameworkData.get(fw.frameworkId);
        const isSupported = isFrameworkSupported(fw.framework.name);

        return (
          <TabsContent key={fw.frameworkId} value={fw.frameworkId} className="mt-4">
            {loadingTab === fw.frameworkId ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !isSupported ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center rounded-lg border">
                <p className="text-muted-foreground">
                  SOA is currently only supported for ISO 27001 framework.
                </p>
                <p className="text-xs text-muted-foreground">
                  Support for {fw.framework.name} will be available soon.
                </p>
              </div>
            ) : data?.configuration ? (
              <SOAFrameworkTable
                framework={data.framework}
                configuration={data.configuration}
                document={data.document}
                organizationId={organizationId}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
