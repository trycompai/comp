'use client';

import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { AssistantSheet } from '@/components/sheets/assistant-sheet';
import { SidebarProvider } from '@/context/sidebar-context';
import { signOut } from '@/utils/auth-client';
import {
  CertificateCheck,
  Chemistry,
  Dashboard,
  Document,
  Group,
  Integration,
  ListChecked,
  Logout,
  Policy,
  Security,
  Settings,
  ShoppingBag,
  Task,
  TaskComplete,
  Warning,
} from '@carbon/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import type { Onboarding, Organization } from '@db';
import type { CommandSearchGroup } from '@trycompai/design-system';
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
  ThemeToggle,
} from '@trycompai/design-system';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const isSettingsActive = pathname?.startsWith(`/${organization.id}/settings`);

  const searchGroups: CommandSearchGroup[] = [
    {
      id: 'navigation',
      label: 'Navigation',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: <Dashboard size={16} />,
          onSelect: () => router.push(`/${organization.id}/frameworks`),
          keywords: ['dashboard', 'home', 'frameworks'],
        },
        ...(hasAuditorRole
          ? [
              {
                id: 'auditor',
                label: 'Auditor View',
                icon: <TaskComplete size={16} />,
                onSelect: () => router.push(`/${organization.id}/auditor`),
                keywords: ['audit', 'review'],
              },
            ]
          : []),
        ...(organization.advancedModeEnabled
          ? [
              {
                id: 'controls',
                label: 'Controls',
                icon: <Security size={16} />,
                onSelect: () => router.push(`/${organization.id}/controls`),
                keywords: ['security', 'compliance'],
              },
            ]
          : []),
        {
          id: 'policies',
          label: 'Policies',
          icon: <Policy size={16} />,
          onSelect: () => router.push(`/${organization.id}/policies`),
          keywords: ['policy', 'documents'],
        },
        {
          id: 'evidence',
          label: 'Evidence',
          icon: <ListChecked size={16} />,
          onSelect: () => router.push(`/${organization.id}/tasks`),
          keywords: ['tasks', 'evidence', 'artifacts'],
        },
        ...(isTrustNdaEnabled
          ? [
              {
                id: 'trust',
                label: 'Trust',
                icon: <Task size={16} />,
                onSelect: () => router.push(`/${organization.id}/trust`),
                keywords: ['trust center', 'portal'],
              },
            ]
          : []),
        {
          id: 'people',
          label: 'People',
          icon: <Group size={16} />,
          onSelect: () => router.push(`/${organization.id}/people/all`),
          keywords: ['users', 'team', 'members', 'employees'],
        },
        {
          id: 'risks',
          label: 'Risks',
          icon: <Warning size={16} />,
          onSelect: () => router.push(`/${organization.id}/risk`),
          keywords: ['risk management', 'assessment'],
        },
        {
          id: 'vendors',
          label: 'Vendors',
          icon: <ShoppingBag size={16} />,
          onSelect: () => router.push(`/${organization.id}/vendors`),
          keywords: ['suppliers', 'third party'],
        },
        ...(isQuestionnaireEnabled
          ? [
              {
                id: 'questionnaire',
                label: 'Questionnaire',
                icon: <Document size={16} />,
                onSelect: () => router.push(`/${organization.id}/questionnaire`),
                keywords: ['survey', 'questions'],
              },
            ]
          : []),
        ...(!isOnlyAuditor
          ? [
              {
                id: 'integrations',
                label: 'Integrations',
                icon: <Integration size={16} />,
                onSelect: () => router.push(`/${organization.id}/integrations`),
                keywords: ['connect', 'apps', 'services'],
              },
            ]
          : []),
        {
          id: 'cloud-tests',
          label: 'Cloud Tests',
          icon: <Chemistry size={16} />,
          onSelect: () => router.push(`/${organization.id}/cloud-tests`),
          keywords: ['testing', 'cloud', 'infrastructure'],
        },
      ],
    },
    ...(!isOnlyAuditor
      ? [
          {
            id: 'settings',
            label: 'Settings',
            items: [
              {
                id: 'settings-general',
                label: 'General Settings',
                icon: <Settings size={16} />,
                onSelect: () => router.push(`/${organization.id}/settings`),
                keywords: ['preferences', 'configuration'],
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <SidebarProvider initialIsCollapsed={isCollapsed}>
      <AppShell showAIChat defaultSidebarOpen={!isCollapsed}>
        <AppShellNavbar
          startContent={
            <HStack gap="xs" align="center">
              <Link href="/">
                <Logo
                  style={{ height: 22, width: 'auto' }}
                  variant={theme === 'dark' ? 'light' : 'dark'}
                />
              </Link>
              <span className="pl-3 pr-1 text-muted-foreground">/</span>
              <OrganizationSwitcher organizations={organizations} organization={organization} />
            </HStack>
          }
          centerContent={<CommandSearch groups={searchGroups} placeholder="Search..." />}
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
