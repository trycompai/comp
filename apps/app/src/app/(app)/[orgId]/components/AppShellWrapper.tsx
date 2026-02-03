'use client';

import { updateSidebarState } from '@/actions/sidebar';
import Chat from '@/components/ai/chat';
import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { canAccessRoute, type UserPermissions } from '@/lib/permissions';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { SidebarProvider, useSidebar } from '@/context/sidebar-context';
import { authClient } from '@/utils/auth-client';
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
  AppShellAIChatTrigger,
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
import { Suspense, useCallback, useRef } from 'react';
import { SettingsSidebar } from '../settings/components/SettingsSidebar';
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
  hasAuditorRole: boolean;
  isOnlyAuditor: boolean;
  permissions: UserPermissions;
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
  hasAuditorRole,
  isOnlyAuditor,
  permissions,
  user,
}: AppShellWrapperContentProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const previousIsCollapsedRef = useRef(isCollapsed);
  const isSettingsActive = pathname?.startsWith(`/${organization.id}/settings`);

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
    isAdvancedModeEnabled: organization.advancedModeEnabled,
    permissions,
  });

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
                variant={resolvedTheme === 'dark' ? 'light' : 'dark'}
              />
            </Link>
            <span className="pl-3 pr-1 text-muted-foreground">/</span>
            <OrganizationSwitcher
              organizations={organizations}
              organization={organization}
              logoUrls={logoUrls}
            />
          </HStack>
        }
        centerContent={<CommandSearch groups={searchGroups} placeholder="Search..." />}
        endContent={
          <AppShellUserMenu>
            <AppShellAIChatTrigger />
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
                  <ThemeSwitcher
                    size="sm"
                    value={(theme ?? 'system') as 'light' | 'dark' | 'system'}
                    defaultValue="system"
                    onChange={(value) => setTheme(value)}
                    showSystem
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          router.push('/auth');
                        },
                      },
                    });
                  }}
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
              isActive={!isSettingsActive}
              icon={<CertificateCheck className="size-5" />}
              label="Compliance"
            />
          </Link>
          {canAccessRoute(permissions, 'settings') && (
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
            <AppShellSidebarHeader title={isSettingsActive ? 'Settings' : 'Compliance'} />
            {isSettingsActive ? (
              <SettingsSidebar orgId={organization.id} showBrowserTab={isWebAutomationsEnabled} permissions={permissions} />
            ) : (
              <AppSidebar
                organization={organization}
                isQuestionnaireEnabled={isQuestionnaireEnabled}
                isTrustNdaEnabled={isTrustNdaEnabled}
                hasAuditorRole={hasAuditorRole}
                isOnlyAuditor={isOnlyAuditor}
                permissions={permissions}
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
  );
}
