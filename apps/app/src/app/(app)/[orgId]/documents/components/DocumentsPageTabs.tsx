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
import { useIso27001FrameworkId } from '../isms/hooks/useIso27001FrameworkId';

interface DocumentsPageTabsProps {
  organizationId: string;
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
  showIsmsTab,
}: {
  tabParam: string | null;
  showIsmsTab: boolean;
}): string {
  if (tabParam === SETTINGS_TAB) return SETTINGS_TAB;
  if (tabParam === ISMS_TAB && showIsmsTab) return ISMS_TAB;
  return DEFAULT_TAB;
}

export function DocumentsPageTabs({
  organizationId,
  ismsContent,
  companyFormsContent,
  settingsContent,
}: DocumentsPageTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  // The ISO 27001 (ISMS) tab is framework-conditional: it appears only when the
  // organization has ISO 27001 active (the same detection the SOA card uses).
  const showIsmsTab = !!useIso27001FrameworkId(organizationId);
  const activeTab = tabParamToInternal({ tabParam: searchParams.get('tab'), showIsmsTab });

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

  // When ISO 27001 is not active the IA is unchanged: a single "Overview" tab plus Settings.
  const companyFormsLabel = showIsmsTab ? 'Company Forms' : 'Overview';

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageLayout
        header={
          <PageHeader
            title="Documents"
            tabs={
              <TabsList variant="underline">
                {showIsmsTab && <TabsTrigger value={ISMS_TAB}>ISO 27001 (ISMS)</TabsTrigger>}
                <TabsTrigger value={COMPANY_FORMS_TAB}>{companyFormsLabel}</TabsTrigger>
                <TabsTrigger value={SETTINGS_TAB}>Settings</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        {showIsmsTab && <TabsContent value={ISMS_TAB}>{ismsContent}</TabsContent>}
        <TabsContent value={COMPANY_FORMS_TAB}>{companyFormsContent}</TabsContent>
        <TabsContent value={SETTINGS_TAB}>{settingsContent}</TabsContent>
      </PageLayout>
    </Tabs>
  );
}
