'use client';

import { updateSidebarState } from '@/actions/sidebar';
import Chat from '@/components/ai/chat';
import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { SidebarProvider, useSidebar } from '@/context/sidebar-context';
import { authClient } from '@/utils/auth-client';
import { CertificateCheck, CloudAuditing, Logout, MagicWand, Security, Settings } from '@carbon/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import type { Onboarding, Organization } from '@db';
import { useAppShell } from '@trycompai/design-system';
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
  CommandSearch,
  HStack,
  Logo,
  Text,
  ThemeSwitcher,
} from '@trycompai/design-system';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comp/ui/tooltip';
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
            <StableShellAIChatTrigger />
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
          <ShellRailNavItem
            href={`/${organization.id}/frameworks`}
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
          )}
          <ShellRailNavItem
            href={`/${organization.id}/security`}
            isActive={isSecurityActive}
            icon={<Security className="size-5" />}
            label="Security"
          />
          {!isOnlyAuditor && (
            <ShellRailNavItem
              href={`/${organization.id}/settings`}
              isActive={isSettingsActive}
              icon={<Settings className="size-5" />}
              label="Settings"
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

function StableShellAIChatTrigger() {
  const { aiChatOpen, toggleAIChat } = useAppShell();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger id="app-shell-ai-chat-trigger" asChild>
        <button
          type="button"
          onClick={toggleAIChat}
          className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            aiChatOpen ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent text-foreground'
          }`}
          aria-label={aiChatOpen ? 'Close AI Chat' : 'Open AI Chat'}
        >
          <MagicWand className="size-4" />
          <span className="hidden sm:inline">Ask AI</span>
          <span className="hidden sm:inline-flex ml-1 opacity-60 text-xs bg-foreground/10 px-1.5 py-0.5 rounded">
            {mounted ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+') : '⌘'}J
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent id="app-shell-ai-chat-content" side="bottom">
        {aiChatOpen ? 'Close AI Chat' : 'Open AI Chat'}
      </TooltipContent>
    </Tooltip>
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
      <Tooltip>
        <TooltipTrigger asChild id={railItemId}>
          <AppShellRailItem
            isActive={isActive}
            icon={icon}
            aria-label={label}
            id={`rail-item-button-${railItemId}`}
          />
        </TooltipTrigger>
        <TooltipContent id={`rail-item-content-${railItemId}`} side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    </Link>
  );
}
