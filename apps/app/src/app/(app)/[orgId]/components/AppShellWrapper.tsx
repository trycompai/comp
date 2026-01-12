'use client';

import { AssistantButton } from '@/components/ai/chat-button';
import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { AssistantSheet } from '@/components/sheets/assistant-sheet';
import { SidebarLogo } from '@/components/sidebar-logo';
import { SignOut } from '@/components/sign-out';
import { SidebarProvider } from '@/context/sidebar-context';
import { CertificateCheck } from '@carbon/icons-react';
import { Avatar, AvatarFallback, AvatarImageNext } from '@comp/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import type { Onboarding, Organization } from '@db';
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellMain,
  AppShellNavbar,
  AppShellRail,
  AppShellRailItem,
  AppShellSidebar,
  AppShellSidebarHeader,
  AppShellUserMenu,
  ThemeToggle,
} from '@trycompai/design-system';
import { useTheme } from 'next-themes';
import Link from 'next/link';
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
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
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
  user,
}: AppShellWrapperProps) {
  const { theme, setTheme } = useTheme();

  return (
    <SidebarProvider initialIsCollapsed={isCollapsed}>
      <AppShell defaultSidebarOpen={!isCollapsed}>
        <AppShellNavbar
          startContent={
            <>
              <SidebarLogo isCollapsed={false} />
              <OrganizationSwitcher
                organizations={organizations}
                organization={organization}
                isCollapsed={false}
                logoUrls={logoUrls}
              />
            </>
          }
          centerContent={<AssistantButton />}
          endContent={
            <AppShellUserMenu>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer rounded-full">
                    {user.image && (
                      <AvatarImageNext
                        src={user.image}
                        alt={user.name ?? user.email}
                        width={32}
                        height={32}
                      />
                    )}
                    <AvatarFallback>
                      <span className="text-xs">
                        {user.name?.charAt(0)?.toUpperCase() ||
                          user.email?.charAt(0)?.toUpperCase()}
                      </span>
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[240px]" sideOffset={10} align="end">
                  <DropdownMenuLabel>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="line-clamp-1 block max-w-[155px] truncate">
                          {user.name}
                        </span>
                        <span className="truncate text-xs font-normal text-[#606060]">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/${organization.id}/settings/user`}>User Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-sm">Theme</span>
                    <ThemeToggle
                      isDark={theme === 'dark'}
                      onChange={(isDark) => setTheme(isDark ? 'dark' : 'light')}
                      size="sm"
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <SignOut />
                </DropdownMenuContent>
              </DropdownMenu>
            </AppShellUserMenu>
          }
        />
        <AppShellBody>
          <AppShellRail>
            <AppShellRailItem
              isActive
              icon={<CertificateCheck className="size-5" />}
              label="Compliance"
            />
          </AppShellRail>
          <AppShellMain>
            <AppShellSidebar collapsible>
              <AppShellSidebarHeader title="Compliance" />
              <AppSidebar
                organization={organization}
                isQuestionnaireEnabled={isQuestionnaireEnabled}
                isTrustNdaEnabled={isTrustNdaEnabled}
                hasAuditorRole={hasAuditorRole}
                isOnlyAuditor={isOnlyAuditor}
              />
            </AppShellSidebar>

            <AppShellContent>
              {onboarding?.triggerJobId && <ConditionalOnboardingTracker onboarding={onboarding} />}
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
