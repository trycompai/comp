'use client';

import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { Header } from '@/components/header';
import { AssistantSheet } from '@/components/sheets/assistant-sheet';
import { SidebarProvider } from '@/context/sidebar-context';
import type { Onboarding, Organization } from '@db';
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellMain,
  AppShellSidebar,
} from '@trycompai/design-system';
import { Suspense } from 'react';
import { AppSidebar } from './AppSidebar';
import { ConditionalOnboardingTracker } from './ConditionalOnboardingTracker';

interface AppShellWrapperProps {
  children: React.ReactNode;
  organization: Organization;
  organizations: Organization[];
  logoUrls: Record<string, string>;
  onboarding: Onboarding | null;
  isCollapsed: boolean;
  isQuestionnaireEnabled: boolean;
  isTrustNdaEnabled: boolean;
  hasAuditorRole: boolean;
  isOnlyAuditor: boolean;
}

export function AppShellWrapper({
  children,
  organization,
  organizations,
  logoUrls,
  onboarding,
  isCollapsed,
  isQuestionnaireEnabled,
  isTrustNdaEnabled,
  hasAuditorRole,
  isOnlyAuditor,
}: AppShellWrapperProps) {
  return (
    <SidebarProvider initialIsCollapsed={isCollapsed}>
      <AppShell defaultSidebarOpen={!isCollapsed}>
        <AppShellBody>
          <AppShellMain>
            <AppShellSidebar width="default">
              <AppSidebar
                organization={organization}
                organizations={organizations}
                logoUrls={logoUrls}
                isQuestionnaireEnabled={isQuestionnaireEnabled}
                isTrustNdaEnabled={isTrustNdaEnabled}
                hasAuditorRole={hasAuditorRole}
                isOnlyAuditor={isOnlyAuditor}
              />
            </AppShellSidebar>

            <AppShellContent>
              {onboarding?.triggerJobId && <ConditionalOnboardingTracker onboarding={onboarding} />}
              <Header organizationId={organization.id} />
              {children}
            </AppShellContent>
          </AppShellMain>

          <AssistantSheet />
          <Suspense fallback={null}>
            <CheckoutCompleteDialog orgId={organization.id} />
          </Suspense>
        </AppShellBody>
      </AppShell>
    </SidebarProvider>
  );
}
