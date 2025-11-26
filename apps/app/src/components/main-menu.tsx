'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Icons } from '@comp/ui/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
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

// Define menu item types with icon component
type MenuItem = {
  id: string;
  path: string;
  name: string;
  disabled: boolean;
  icon: React.FC<{ size?: number }>;
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
  isCollapsed?: boolean;
  onItemClick?: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
}

export type Props = {
  organizationId?: string;
  organization?: { advancedModeEnabled?: boolean } | null;
  isCollapsed?: boolean;
  onItemClick?: () => void;
  isQuestionnaireEnabled?: boolean;
  isTrustNdaEnabled?: boolean;
  hasAuditorRole?: boolean;
  isOnlyAuditor?: boolean;
};

export function MainMenu({
  organizationId,
  organization,
  isCollapsed = false,
  onItemClick,
  isQuestionnaireEnabled = false,
  isTrustNdaEnabled = false,
  hasAuditorRole = false,
  isOnlyAuditor = false,
}: Props) {
  const pathname = usePathname();
  const [activeStyle, setActiveStyle] = useState({ top: '0px', height: '0px' });
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Helper function to check if a path is active
  const isPathActive = (itemPath: string) => {
    const normalizedItemPath = itemPath.replace(':organizationId', organizationId ?? '');

    // Extract the base path from the menu item (first two segments after normalization)
    const itemPathParts = normalizedItemPath.split('/').filter(Boolean);
    const itemBaseSegment = itemPathParts.length > 1 ? itemPathParts[1] : '';

    // Extract the current path parts
    const currentPathParts = pathname.split('/').filter(Boolean);
    const currentBaseSegment = currentPathParts.length > 1 ? currentPathParts[1] : '';

    // Special case for root organization path
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

  // Update active indicator position
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
  }, [activeIndex, pathname]);

  // Handle window resize to recalculate positions
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
    <nav className="relative space-y-1">
      {/* Active Indicator */}
      <div
        className="bg-primary absolute -right-4 w-0.5 rounded-l-xs transition-all duration-300 ease-out"
        style={activeStyle}
      />

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
    </nav>
  );
}

const Item = ({
  organizationId,
  item,
  isActive,
  disabled,
  isCollapsed = false,
  onItemClick,
  itemRef,
}: ItemProps) => {
  const Icon = item.icon;
  const linkDisabled = disabled || item.disabled;
  const itemPath = item.path.replace(':organizationId', organizationId ?? '');

  if (linkDisabled) {
    return (
      <div ref={itemRef}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size={isCollapsed ? 'icon' : 'default'}
                className={cn(
                  'w-full cursor-not-allowed opacity-50',
                  isCollapsed ? 'justify-center' : 'justify-start',
                )}
                disabled
              >
                <Icon size={16} />
                {!isCollapsed && <span className="ml-2 truncate">Coming Soon</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Coming Soon</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div ref={itemRef}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              size={isCollapsed ? 'icon' : 'default'}
              className={cn('w-full', isCollapsed ? 'justify-center' : 'justify-start')}
              asChild
            >
              <Link href={itemPath} onClick={onItemClick}>
                <Icon size={16} />
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
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" sideOffset={8}>
              <div className="flex items-center gap-2">
                {item.name}
                {item.badge && (
                  <Badge variant={item.badge.variant} className="text-xs">
                    {item.badge.text}
                  </Badge>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
