'use client';

import { Badge } from '@comp/ui/badge';
import { cn } from '@comp/ui/cn';
import { Icons } from '@comp/ui/icons';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@comp/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comp/ui/tooltip';
import {
  ClipboardCheck,
  FileTextIcon,
  FlaskConical,
  Gauge,
  ListCheck,
  NotebookText,
  ShieldCheck,
  ShieldEllipsis,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type MenuItem = {
  id: string;
  path: string;
  name: string;
  disabled: boolean;
  icon: React.FC<{ size?: number; className?: string }>;
  protected: boolean;
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  };
  hidden?: boolean;
};

interface ItemProps {
  organizationId?: string;
  item: MenuItem;
  isActive: boolean;
  disabled: boolean;
  isCollapsed: boolean;
  onItemClick?: () => void;
  itemRef: (el: HTMLLIElement | null) => void;
}

export type Props = {
  organizationId?: string;
  organization?: { advancedModeEnabled?: boolean } | null;
  onItemClick?: () => void;
  isQuestionnaireEnabled?: boolean;
  isTrustNdaEnabled?: boolean;
  hasAuditorRole?: boolean;
  isOnlyAuditor?: boolean;
};

export function MainMenu({
  organizationId,
  organization,
  onItemClick,
  isQuestionnaireEnabled = false,
  isTrustNdaEnabled = false,
  hasAuditorRole = false,
  isOnlyAuditor = false,
}: Props) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [activeStyle, setActiveStyle] = useState({ top: '0px', height: '0px' });
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const items: MenuItem[] = [
    {
      id: 'frameworks',
      path: '/:organizationId/frameworks',
      name: 'Overview',
      disabled: false,
      icon: Gauge,
      protected: false,
    },
    {
      id: 'auditor',
      path: '/:organizationId/auditor',
      name: 'Auditor View',
      disabled: false,
      icon: ClipboardCheck,
      protected: false,
      hidden: !hasAuditorRole,
    },
    {
      id: 'controls',
      path: '/:organizationId/controls',
      name: 'Controls',
      disabled: false,
      icon: ShieldEllipsis,
      protected: false,
      hidden: !organization?.advancedModeEnabled,
    },
    {
      id: 'policies',
      path: '/:organizationId/policies',
      name: 'Policies',
      disabled: false,
      icon: NotebookText,
      protected: false,
    },
    {
      id: 'tasks',
      path: '/:organizationId/tasks',
      name: 'Tasks',
      disabled: false,
      icon: ListCheck,
      protected: false,
    },
    {
      id: 'trust',
      path: '/:organizationId/trust',
      name: 'Trust',
      disabled: false,
      icon: ShieldCheck,
      protected: false,
      hidden: !isTrustNdaEnabled,
    },
    {
      id: 'people',
      path: '/:organizationId/people/all',
      name: 'People',
      disabled: false,
      icon: Users,
      protected: false,
    },
    {
      id: 'risk',
      path: '/:organizationId/risk',
      name: 'Risks',
      disabled: false,
      icon: Icons.Risk,
      protected: false,
    },
    {
      id: 'vendors',
      path: '/:organizationId/vendors',
      name: 'Vendors',
      disabled: false,
      icon: Store,
      protected: false,
    },
    {
      id: 'questionnaire',
      path: '/:organizationId/questionnaire',
      name: 'Questionnaire',
      disabled: false,
      icon: FileTextIcon,
      protected: false,
      hidden: !isQuestionnaireEnabled,
    },
    {
      id: 'integrations',
      path: '/:organizationId/integrations',
      name: 'Integrations',
      disabled: false,
      icon: Zap,
      protected: false,
      hidden: isOnlyAuditor,
    },
    {
      id: 'tests',
      path: '/:organizationId/cloud-tests',
      name: 'Cloud Tests',
      disabled: false,
      icon: FlaskConical,
      protected: false,
    },
    {
      id: 'settings',
      path: '/:organizationId/settings',
      name: 'Settings',
      disabled: false,
      icon: Icons.Settings,
      protected: true,
      hidden: isOnlyAuditor,
    },
  ];

  const isPathActive = (itemPath: string) => {
    const normalizedItemPath = itemPath.replace(':organizationId', organizationId ?? '');
    const itemPathParts = normalizedItemPath.split('/').filter(Boolean);
    const itemBaseSegment = itemPathParts.length > 1 ? itemPathParts[1] : '';
    const currentPathParts = pathname.split('/').filter(Boolean);
    const currentBaseSegment = currentPathParts.length > 1 ? currentPathParts[1] : '';

    if (
      normalizedItemPath === `/${organizationId}` ||
      normalizedItemPath === `/${organizationId}/implementation`
    ) {
      return (
        pathname === `/${organizationId}` ||
        pathname?.startsWith(`/${organizationId}/implementation`)
      );
    }

    return itemBaseSegment === currentBaseSegment;
  };

  const visibleItems = items.filter((item) => !item.disabled && !item.hidden);
  const activeIndex = visibleItems.findIndex((item) => isPathActive(item.path));

  useEffect(() => {
    if (activeIndex >= 0) {
      const activeElement = itemRefs.current[activeIndex];
      if (activeElement) {
        const { offsetTop, offsetHeight } = activeElement;
        setActiveStyle({
          top: `${offsetTop}px`,
          height: `${offsetHeight}px`,
        });
      }
    }
  }, [activeIndex, pathname, isCollapsed]);

  useEffect(() => {
    const handleResize = () => {
      if (activeIndex >= 0) {
        requestAnimationFrame(() => {
          const activeElement = itemRefs.current[activeIndex];
          if (activeElement) {
            const { offsetTop, offsetHeight } = activeElement;
            setActiveStyle({
              top: `${offsetTop}px`,
              height: `${offsetHeight}px`,
            });
          }
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex]);

  return (
    <SidebarGroup className="relative p-0">
      <div
        className="bg-primary absolute -right-2 w-0.5 rounded-l-xs transition-all duration-300 ease-out"
        style={activeStyle}
      />
      <SidebarMenu>
        {visibleItems.map((item, index) => {
          const isActive = isPathActive(item.path);
          return (
            <Item
              key={item.id}
              organizationId={organizationId ?? ''}
              item={item}
              isActive={isActive}
              disabled={item.disabled}
              isCollapsed={isCollapsed}
              onItemClick={onItemClick}
              itemRef={(el) => {
                itemRefs.current[index] = el;
              }}
            />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
function Item({
  organizationId,
  item,
  isActive,
  disabled,
  isCollapsed,
  onItemClick,
  itemRef,
}: ItemProps) {
  const Icon = item.icon;
  const linkDisabled = disabled || item.disabled;
  const itemPath = item.path.replace(':organizationId', organizationId ?? '');

  if (linkDisabled) {
    return (
      <SidebarMenuItem ref={itemRef}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              disabled
              size="default"
              className={cn('cursor-not-allowed', isCollapsed ? 'justify-center' : 'justify-start')}
            >
              <Icon size={16} className="shrink-0" />
              {!isCollapsed && <span className="ml-2 truncate">Coming Soon</span>}
            </SidebarMenuButton>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Coming Soon</TooltipContent>}
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  const tooltipContent = (
    <div className="flex items-center gap-2">
      {item.name}
      {item.badge && (
        <Badge variant={item.badge.variant} className="text-xs">
          {item.badge.text}
        </Badge>
      )}
    </div>
  );

  return (
    <SidebarMenuItem ref={itemRef}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            size="default"
            className={cn(isCollapsed ? 'justify-center' : 'justify-start')}
          >
            <Link href={itemPath} onClick={onItemClick}>
              <Icon size={16} className="shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="ml-2 flex-1 truncate text-left">{item.name}</span>
                  {item.badge && (
                    <Badge variant={item.badge.variant} className="ml-auto text-xs">
                      {item.badge.text}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          </SidebarMenuButton>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right" sideOffset={8}>
            {tooltipContent}
          </TooltipContent>
        )}
      </Tooltip>
    </SidebarMenuItem>
  );
}
