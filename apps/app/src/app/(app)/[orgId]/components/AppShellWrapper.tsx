'use client';

import { AssistantButton } from '@/components/ai/chat-button';
import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { AssistantSheet } from '@/components/sheets/assistant-sheet';
import { SidebarProvider } from '@/context/sidebar-context';
import { signOut } from '@/utils/auth-client';
import { CertificateCheck, Logout, Settings } from '@carbon/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  LogoIcon,
  Text,
  ThemeToggle,
} from '@trycompai/design-system';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const isSettingsActive = pathname?.startsWith(`/${organization.id}/settings`);

  return (
    <SidebarProvider initialIsCollapsed={isCollapsed}>
      <AppShell defaultSidebarOpen={!isCollapsed}>
        <AppShellNavbar
          startContent={
            <>
              <Link href="/">
                <LogoIcon width={32} height={32} variant={theme === 'dark' ? 'light' : 'dark'} />
              </Link>
              <OrganizationSwitcher organizations={organizations} organization={organization} />
            </>
          }
          centerContent={<AssistantButton />}
          endContent={
            <AppShellUserMenu>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted">
                  <Avatar>
                    {user.image && <AvatarImage src={user.image} />}
                    <AvatarFallback>
                      {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" style={{ minWidth: '200px' }}>
                  <div className="px-2 py-1.5">
                    <Text size="sm" weight="medium">
                      {user.name}
                    </Text>
                    <Text size="xs" variant="muted">
                      {user.email}
                    </Text>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <Link href={`/${organization.id}/settings`}>
                      <DropdownMenuItem>
                        <Settings size={16} />
                        Settings
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <Text size="sm">Theme</Text>
                    <ThemeToggle
                      size="sm"
                      isDark={theme === 'dark'}
                      onChange={(isDark) => setTheme(isDark ? 'dark' : 'light')}
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <Logout size={16} />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </AppShellUserMenu>
          }
        />
        <AppShellBody>
          <AppShellRail>
            <AppShellRailItem
              isActive={!isSettingsActive}
              icon={<CertificateCheck className="size-5" />}
              label="Compliance"
            />
            {!isOnlyAuditor && (
              <Link href={`/${organization.id}/settings`}>
                <AppShellRailItem
                  isActive={isSettingsActive}
                  icon={<Settings className="size-5" />}
                  label="Settings"
                />
              </Link>
            )}
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
