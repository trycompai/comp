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
  isIsmsEnabled: boolean;
  ismsContent: ReactNode;
  companyFormsContent: ReactNode;
  settingsContent: ReactNode;
}

const ISMS_TAB = 'iso-27001';
const COMPANY_FORMS_TAB = 'overview';
const SETTINGS_TAB = 'settings';
const DEFAULT_TAB = COMPANY_FORMS_TAB;

function tabParamToInternal({
  tabParam,
  isIsmsEnabled,
}: {
  tabParam: string | null;
  isIsmsEnabled: boolean;
}): string {
  if (tabParam === SETTINGS_TAB) return SETTINGS_TAB;
  if (tabParam === ISMS_TAB && isIsmsEnabled) return ISMS_TAB;
  return DEFAULT_TAB;
}

export function DocumentsPageTabs({
  isIsmsEnabled,
  ismsContent,
  companyFormsContent,
  settingsContent,
}: DocumentsPageTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = tabParamToInternal({ tabParam: searchParams.get('tab'), isIsmsEnabled });

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

  // When ISMS is off the IA is unchanged: a single "Overview" tab plus Settings.
  const companyFormsLabel = isIsmsEnabled ? 'Company Forms' : 'Overview';

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageLayout
        header={
          <PageHeader
            title="Documents"
            tabs={
              <TabsList variant="underline">
                {isIsmsEnabled && (
                  <TabsTrigger value={ISMS_TAB}>ISO 27001 (ISMS)</TabsTrigger>
                )}
                <TabsTrigger value={COMPANY_FORMS_TAB}>{companyFormsLabel}</TabsTrigger>
                <TabsTrigger value={SETTINGS_TAB}>Settings</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        {isIsmsEnabled && <TabsContent value={ISMS_TAB}>{ismsContent}</TabsContent>}
        <TabsContent value={COMPANY_FORMS_TAB}>{companyFormsContent}</TabsContent>
        <TabsContent value={SETTINGS_TAB}>{settingsContent}</TabsContent>
      </PageLayout>
    </Tabs>
  );
}
