import {
  Chemistry,
  Dashboard,
  Document,
  Group,
  Integration,
  ListChecked,
  Policy,
  Security,
  Settings,
  ShoppingBag,
  Task,
  TaskComplete,
  Warning,
} from '@carbon/icons-react';
import type { UserPermissions } from '@/lib/permissions';
import { canAccessRoute } from '@/lib/permissions';
import type { CommandSearchGroup } from '@trycompai/design-system';
import type { ReactNode } from 'react';

interface AppShellSearchGroupsParams {
  organizationId: string;
  router: {
    push: (href: string) => void;
  };
  hasAuditorRole: boolean;
  isOnlyAuditor: boolean;
  isQuestionnaireEnabled: boolean;
  isTrustNdaEnabled: boolean;
  isAdvancedModeEnabled: boolean;
  permissions: UserPermissions;
}

interface NavigationItemParams {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  keywords: string[];
  router: {
    push: (href: string) => void;
  };
}

const createNavItem = ({
  id,
  label,
  icon,
  path,
  keywords,
  router,
}: NavigationItemParams): CommandSearchGroup['items'][number] => ({
  id,
  label,
  icon,
  keywords,
  onSelect: () => router.push(path),
});

export const getAppShellSearchGroups = ({
  organizationId,
  router,
  hasAuditorRole,
  isQuestionnaireEnabled,
  isTrustNdaEnabled,
  isAdvancedModeEnabled,
  permissions,
}: AppShellSearchGroupsParams): CommandSearchGroup[] => {
  const baseItems = [
    ...(canAccessRoute(permissions, 'frameworks')
      ? [
          createNavItem({
            id: 'overview',
            label: 'Overview',
            icon: <Dashboard size={16} />,
            path: `/${organizationId}/frameworks`,
            keywords: ['dashboard', 'home', 'frameworks'],
            router,
          }),
        ]
      : []),
    ...(hasAuditorRole && canAccessRoute(permissions, 'auditor')
      ? [
          createNavItem({
            id: 'auditor',
            label: 'Auditor View',
            icon: <TaskComplete size={16} />,
            path: `/${organizationId}/auditor`,
            keywords: ['audit', 'review'],
            router,
          }),
        ]
      : []),
    ...(isAdvancedModeEnabled && canAccessRoute(permissions, 'controls')
      ? [
          createNavItem({
            id: 'controls',
            label: 'Controls',
            icon: <Security size={16} />,
            path: `/${organizationId}/controls`,
            keywords: ['security', 'compliance'],
            router,
          }),
        ]
      : []),
    ...(canAccessRoute(permissions, 'policies')
      ? [
          createNavItem({
            id: 'policies',
            label: 'Policies',
            icon: <Policy size={16} />,
            path: `/${organizationId}/policies`,
            keywords: ['policy', 'documents'],
            router,
          }),
        ]
      : []),
    ...(canAccessRoute(permissions, 'tasks')
      ? [
          createNavItem({
            id: 'evidence',
            label: 'Evidence',
            icon: <ListChecked size={16} />,
            path: `/${organizationId}/tasks`,
            keywords: ['tasks', 'evidence', 'artifacts'],
            router,
          }),
        ]
      : []),
    ...(isTrustNdaEnabled && canAccessRoute(permissions, 'trust')
      ? [
          createNavItem({
            id: 'trust',
            label: 'Trust',
            icon: <Task size={16} />,
            path: `/${organizationId}/trust`,
            keywords: ['trust center', 'portal'],
            router,
          }),
        ]
      : []),
    ...(canAccessRoute(permissions, 'people')
      ? [
          createNavItem({
            id: 'people',
            label: 'People',
            icon: <Group size={16} />,
            path: `/${organizationId}/people/all`,
            keywords: ['users', 'team', 'members', 'employees'],
            router,
          }),
        ]
      : []),
    ...(canAccessRoute(permissions, 'risk')
      ? [
          createNavItem({
            id: 'risks',
            label: 'Risks',
            icon: <Warning size={16} />,
            path: `/${organizationId}/risk`,
            keywords: ['risk management', 'assessment'],
            router,
          }),
        ]
      : []),
    ...(canAccessRoute(permissions, 'vendors')
      ? [
          createNavItem({
            id: 'vendors',
            label: 'Vendors',
            icon: <ShoppingBag size={16} />,
            path: `/${organizationId}/vendors`,
            keywords: ['suppliers', 'third party'],
            router,
          }),
        ]
      : []),
    ...(isQuestionnaireEnabled && canAccessRoute(permissions, 'questionnaire')
      ? [
          createNavItem({
            id: 'questionnaire',
            label: 'Questionnaire',
            icon: <Document size={16} />,
            path: `/${organizationId}/questionnaire`,
            keywords: ['survey', 'questions'],
            router,
          }),
        ]
      : []),
    ...(canAccessRoute(permissions, 'integrations')
      ? [
          createNavItem({
            id: 'integrations',
            label: 'Integrations',
            icon: <Integration size={16} />,
            path: `/${organizationId}/integrations`,
            keywords: ['connect', 'apps', 'services'],
            router,
          }),
        ]
      : []),
    ...(canAccessRoute(permissions, 'cloud-tests')
      ? [
          createNavItem({
            id: 'cloud-tests',
            label: 'Cloud Tests',
            icon: <Chemistry size={16} />,
            path: `/${organizationId}/cloud-tests`,
            keywords: ['testing', 'cloud', 'infrastructure'],
            router,
          }),
        ]
      : []),
  ];

  return [
    {
      id: 'navigation',
      label: 'Navigation',
      items: baseItems,
    },
    ...(canAccessRoute(permissions, 'settings')
      ? [
          {
            id: 'settings',
            label: 'Settings',
            items: [
              createNavItem({
                id: 'settings-general',
                label: 'General Settings',
                icon: <Settings size={16} />,
                path: `/${organizationId}/settings`,
                keywords: ['preferences', 'configuration'],
                router,
              }),
            ],
          },
        ]
      : []),
  ];
};
