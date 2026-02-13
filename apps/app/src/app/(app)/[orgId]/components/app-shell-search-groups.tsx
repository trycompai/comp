import {
  Catalog,
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
  isOnlyAuditor,
  isQuestionnaireEnabled,
  isTrustNdaEnabled,
  isAdvancedModeEnabled,
}: AppShellSearchGroupsParams): CommandSearchGroup[] => {
  const baseItems = [
    createNavItem({
      id: 'overview',
      label: 'Overview',
      icon: <Dashboard size={16} />,
      path: `/${organizationId}/frameworks`,
      keywords: ['dashboard', 'home', 'frameworks'],
      router,
    }),
    ...(hasAuditorRole
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
    ...(isAdvancedModeEnabled
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
    createNavItem({
      id: 'policies',
      label: 'Policies',
      icon: <Policy size={16} />,
      path: `/${organizationId}/policies`,
      keywords: ['policy', 'documents'],
      router,
    }),
    createNavItem({
      id: 'evidence',
      label: 'Evidence',
      icon: <ListChecked size={16} />,
      path: `/${organizationId}/tasks`,
      keywords: ['tasks', 'evidence', 'artifacts'],
      router,
    }),
    ...(isTrustNdaEnabled
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
    createNavItem({
      id: 'documents',
      label: 'Documents',
      icon: <Catalog size={16} />,
      path: `/${organizationId}/documents`,
      keywords: ['company', 'tasks', 'forms', 'evidence submissions', 'documents'],
      router,
    }),
    createNavItem({
      id: 'people',
      label: 'People',
      icon: <Group size={16} />,
      path: `/${organizationId}/people/all`,
      keywords: ['users', 'team', 'members', 'employees'],
      router,
    }),
    createNavItem({
      id: 'risks',
      label: 'Risks',
      icon: <Warning size={16} />,
      path: `/${organizationId}/risk`,
      keywords: ['risk management', 'assessment'],
      router,
    }),
    createNavItem({
      id: 'vendors',
      label: 'Vendors',
      icon: <ShoppingBag size={16} />,
      path: `/${organizationId}/vendors`,
      keywords: ['suppliers', 'third party'],
      router,
    }),
    ...(isQuestionnaireEnabled
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
    ...(!isOnlyAuditor
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
    createNavItem({
      id: 'cloud-tests',
      label: 'Cloud Tests',
      icon: <Chemistry size={16} />,
      path: `/${organizationId}/cloud-tests`,
      keywords: ['testing', 'cloud', 'infrastructure'],
      router,
    }),
  ];

  return [
    {
      id: 'navigation',
      label: 'Navigation',
      items: baseItems,
    },
    ...(!isOnlyAuditor
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
