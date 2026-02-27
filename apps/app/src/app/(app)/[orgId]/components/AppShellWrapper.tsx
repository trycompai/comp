'use client';

import { updateSidebarState } from '@/actions/sidebar';
import Chat from '@/components/ai/chat';
import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { SidebarProvider, useSidebar } from '@/context/sidebar-context';
import { authClient } from '@/utils/auth-client';
import { CertificateCheck, CloudAuditing, Logout, Security, Settings } from '@carbon/icons-react';
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
  AppShellAIChatTrigger,
  AppShellRailItem,
  AppShellSidebar,
  AppShellSidebarHeader,
  AppShellUserMenu,
  TooltipProvider,
  Avatar,
  AvatarFallback,
  AvatarImage,
  CommandSearch,
  HStack,
  Logo,
  Text,
  ThemeSwitcher,
} from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { SettingsSidebar } from '../settings/components/SettingsSidebar';
import { SecuritySidebar } from '../security/components/SecuritySidebar';
import { TrustSidebar } from '../trust/components/TrustSidebar';
import { getAppShellSearchGroups } from './app-shell-search-groups';
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
  isWebAutomationsEnabled: boolean;
  isSecurityEnabled: boolean;
  hasAuditorRole: boolean;
  isOnlyAuditor: boolean;
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
}

type AppShellWrapperContentProps = Omit<AppShellWrapperProps, 'isCollapsed'>;

export function AppShellWrapper({ isCollapsed, ...props }: AppShellWrapperProps) {
  return (
    <SidebarProvider initialIsCollapsed={isCollapsed}>
      <AppShellWrapperContent {...props} />
    </SidebarProvider>
  );
}

function AppShellWrapperContent({
  children,
  organization,
  organizations,
  logoUrls,
  onboarding,
  isQuestionnaireEnabled,
  isTrustNdaEnabled,
  isWebAutomationsEnabled,
  isSecurityEnabled,
  hasAuditorRole,
  isOnlyAuditor,
  user,
}: AppShellWrapperContentProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const previousIsCollapsedRef = useRef(isCollapsed);
  const [logoVariant, setLogoVariant] = useState<'dark' | 'light'>('dark');
  const isSettingsActive = pathname?.startsWith(`/${organization.id}/settings`);
  const isTrustActive = pathname?.startsWith(`/${organization.id}/trust`);
  const isSecurityActive = pathname?.startsWith(`/${organization.id}/security`);

  const { execute } = useAction(updateSidebarState, {
    onError: () => {
      setIsCollapsed(previousIsCollapsedRef.current);
    },
  });

  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      const nextIsCollapsed = !open;
      previousIsCollapsedRef.current = isCollapsed;
      setIsCollapsed(nextIsCollapsed);
      execute({ isCollapsed: nextIsCollapsed });
    },
    [execute, isCollapsed, setIsCollapsed],
  );

  const searchGroups = getAppShellSearchGroups({
    organizationId: organization.id,
    router,
    hasAuditorRole,
    isOnlyAuditor,
    isQuestionnaireEnabled,
    isTrustNdaEnabled,
    isSecurityEnabled,
    isAdvancedModeEnabled: organization.advancedModeEnabled,
  });

  useEffect(() => {
    setLogoVariant(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme]);

  return (
    <AppShell
      showAIChat
      aiChatContent={<Chat />}
      sidebarOpen={!isCollapsed}
      onSidebarOpenChange={handleSidebarOpenChange}
    >
      <AppShellNavbar
        startContent={
          <HStack gap="xs" align="center">
            <Link href="/">
              <Logo
                style={{ height: 22, width: 'auto' }}
                variant={logoVariant}
              />
            </HStack>
          }
          centerContent={<CommandSearch groups={searchGroups} placeholder="Search..." />}
          endContent={
            <AppShellUserMenu>
              <AppShellAIChatTrigger />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="app-shell-user-menu-trigger"
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted"
                >
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
          <Link href={`/${organization.id}/frameworks`}>
            <AppShellRailItem
              isActive={!isSettingsActive && !isTrustActive && !isSecurityActive}
              icon={<CertificateCheck className="size-5" />}
              label="Compliance"
            />
            {isTrustNdaEnabled && (
              <ShellRailNavItem
                href={`/${organization.id}/trust`}
                isActive={isTrustActive}
                icon={<CloudAuditing className="size-5" />}
                label="Trust"
              />
            </Link>
          )}
          <Link href={`/${organization.id}/security`}>
            <AppShellRailItem
              isActive={isSecurityActive}
              icon={<Security className="size-5" />}
              label="Security"
            />
          </Link>
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
            <AppShellSidebarHeader
              title={
                isSettingsActive
                  ? 'Settings'
                  : isTrustActive
                    ? 'Trust'
                    : isSecurityActive
                      ? 'Security'
                    : 'Compliance'
              }
            />
            {isSettingsActive ? (
              <SettingsSidebar orgId={organization.id} showBrowserTab={isWebAutomationsEnabled} />
            ) : isTrustActive ? (
              <TrustSidebar orgId={organization.id} />
            ) : isSecurityActive ? (
              <SecuritySidebar orgId={organization.id} />
            ) : (
              <AppSidebar
                organization={organization}
                isQuestionnaireEnabled={isQuestionnaireEnabled}
                hasAuditorRole={hasAuditorRole}
                isOnlyAuditor={isOnlyAuditor}
              />
            )}
          </AppShellRail>
          <AppShellMain>
            <AppShellSidebar collapsible>
              <AppShellSidebarHeader
                title={
                  isSettingsActive
                    ? 'Settings'
                    : isTrustActive
                      ? 'Trust'
                      : isSecurityActive
                        ? 'Security'
                        : 'Compliance'
                }
              />
              {isSettingsActive ? (
                <SettingsSidebar orgId={organization.id} showBrowserTab={isWebAutomationsEnabled} />
              ) : isTrustActive ? (
                <TrustSidebar orgId={organization.id} />
              ) : isSecurityActive && isSecurityEnabled ? (
                <SecuritySidebar orgId={organization.id} />
              ) : (
                <AppSidebar
                  organization={organization}
                  isQuestionnaireEnabled={isQuestionnaireEnabled}
                  hasAuditorRole={hasAuditorRole}
                  isOnlyAuditor={isOnlyAuditor}
                />
              )}
            </AppShellSidebar>

            <AppShellContent>
              {onboarding?.triggerJobId && <ConditionalOnboardingTracker onboarding={onboarding} />}
              {children}
            </AppShellContent>
          </AppShellMain>

          <Suspense fallback={null}>
            <CheckoutCompleteDialog orgId={organization.id} />
          </Suspense>
        </AppShellBody>
      </AppShell>
    </TooltipProvider>
  );
}

function ShellRailNavItem({
  href,
  isActive,
  icon,
  label,
}: {
  href: string;
  isActive: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  const railItemId = `app-shell-rail-${label.toLowerCase()}`;

  return (
    <Link href={href}>
      <AppShellRailItem
        isActive={isActive}
        icon={icon}
        id={railItemId}
        label={label}
      />
    </Link>
  );
}
