'use client';

import { updateSidebarState } from '@/actions/sidebar';
import Chat from '@/components/ai/chat';
import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { SidebarProvider, useSidebar } from '@/context/sidebar-context';
import { canAccessCompliance, canAccessRoute, hasAnyPermission, type UserPermissions } from '@/lib/permissions';
import { authClient } from '@/utils/auth-client';
import { Badge, Globe, Locked, Logout, ManageProtection, Settings } from '@carbon/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';
import type { Onboarding, Organization } from '@db';
import type { OrganizationFromMe } from '@/types';
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
import { AdminSidebar } from '../admin/components/AdminSidebar';
import { ImpersonationBanner } from '../admin/components/ImpersonationBanner';
import { SettingsSidebar } from '../settings/components/SettingsSidebar';
import { SecuritySidebar } from '../security/components/SecuritySidebar';
import { TrustSidebar } from '../trust/components/TrustSidebar';
import { getAppShellSearchGroups } from './app-shell-search-groups';
import { AppSidebar } from './AppSidebar';
import { ConditionalOnboardingTracker } from './ConditionalOnboardingTracker';

interface AppShellWrapperProps {
  children: React.ReactNode;
  organization: Organization;
  organizations: OrganizationFromMe[];
  logoUrls: Record<string, string>;
  onboarding: Onboarding | null;
  isCollapsed: boolean;
  isQuestionnaireEnabled: boolean;
  isTrustNdaEnabled: boolean;
  isWebAutomationsEnabled: boolean;
  isSecurityEnabled: boolean;
  hasAuditorRole: boolean;
  isOnlyAuditor: boolean;
  permissions: UserPermissions;
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
  isAdmin: boolean;
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
  permissions,
  user,
  isAdmin,
}: AppShellWrapperContentProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const previousIsCollapsedRef = useRef(isCollapsed);
  const isSettingsActive = pathname?.startsWith(`/${organization.id}/settings`);
  const isTrustActive = pathname?.startsWith(`/${organization.id}/trust`);
  const isSecurityActive = pathname?.startsWith(`/${organization.id}/security`);
  const isAdminActive = pathname?.startsWith(`/${organization.id}/admin`);
  const [logoVariant, setLogoVariant] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (!resolvedTheme) {
      return;
    }

    setLogoVariant(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme]);

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
    permissions,
    hasAuditorRole,
    isOnlyAuditor,
    isQuestionnaireEnabled,
    isTrustNdaEnabled,
    isSecurityEnabled,
    isAdvancedModeEnabled: organization.advancedModeEnabled,
  });

  return (
    <TooltipProvider>
      <ImpersonationBanner />
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
                <DropdownMenuTrigger
                  id="app-shell-user-menu-trigger"
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted"
                >
                  <Avatar>
                    {user.image && <AvatarImage src={user.image} />}
                    <AvatarFallback>
                      {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  id="app-shell-user-menu-content"
                  align="end"
                  style={{ minWidth: '200px' }}
                >
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
            {canAccessCompliance(permissions) && (
              <ShellRailNavItem
                href={`/${organization.id}/overview`}
                isActive={!isSettingsActive && !isTrustActive && !isSecurityActive && !isAdminActive}
                icon={<Badge className="size-5" />}
                label="Compliance"
              />
            )}
            {isTrustNdaEnabled && hasAnyPermission(permissions, [{ resource: 'trust', action: 'read' }]) && (
              <ShellRailNavItem
                href={`/${organization.id}/trust`}
                isActive={isTrustActive}
                icon={<Globe className="size-5" />}
                label="Trust"
              />
            )}
            {isSecurityEnabled && canAccessRoute(permissions, 'penetration-tests') ? (
              <ShellRailNavItem
                href={`/${organization.id}/security`}
                isActive={isSecurityActive}
                icon={<ManageProtection className="size-5" />}
                label="Security"
              />
            ) : null}
            {!isOnlyAuditor && canAccessRoute(permissions, 'settings') && (
              <ShellRailNavItem
                href={`/${organization.id}/settings`}
                isActive={isSettingsActive}
                icon={<Settings className="size-5" />}
                label="Settings"
              />
            )}
            {isAdmin && (
              <ShellRailNavItem
                href={`/${organization.id}/admin`}
                isActive={!!isAdminActive}
                icon={<Locked className="size-5" />}
                label="Admin"
              />
            )}
          </AppShellRail>
          <AppShellMain>
            <AppShellSidebar collapsible>
              <AppShellSidebarHeader
                title={
                  isAdminActive
                    ? 'Admin'
                    : isSettingsActive
                      ? 'Settings'
                      : isTrustActive
                        ? 'Trust'
                        : isSecurityActive
                          ? 'Security'
                          : 'Compliance'
                }
              />
              {isAdminActive && isAdmin ? (
                <AdminSidebar orgId={organization.id} />
              ) : isSettingsActive ? (
                <SettingsSidebar orgId={organization.id} showBrowserTab={isWebAutomationsEnabled} showBillingTab={isSecurityEnabled} />
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
