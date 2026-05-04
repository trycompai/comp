'use client';

import {
  PageHeader,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

interface DocumentsPageTabsProps {
  overviewContent: ReactNode;
  settingsContent: ReactNode;
}

const DEFAULT_TAB = 'overview';

function tabParamToInternal(tabParam: string | null): string {
  if (tabParam === 'settings') return 'settings';
  return DEFAULT_TAB;
}

export function DocumentsPageTabs({ overviewContent, settingsContent }: DocumentsPageTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = tabParamToInternal(searchParams.get('tab'));

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === DEFAULT_TAB) {
        params.delete('tab');
      } else {
        params.set('tab', value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageLayout
        header={
          <PageHeader
            title="Documents"
            tabs={
              <TabsList variant="underline">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        <TabsContent value="overview">{overviewContent}</TabsContent>
        <TabsContent value="settings">{settingsContent}</TabsContent>
      </PageLayout>
    </Tabs>
  );
}
