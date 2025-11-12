'use client';

import { Badge } from '@comp/ui/badge';
import { Icons } from '@comp/ui/icons';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  FlaskConical,
  Gauge,
  ListCheck,
  NotebookText,
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
  onItemClick?: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
}

export function MainMenu({ organizationId, organization, onItemClick }: Props) {
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
      id: 'integrations',
      path: '/:organizationId/integrations',
      name: 'Integrations',
      disabled: false,
      icon: Zap,
      protected: false,
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
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none bg-primary absolute -right-2 z-20 w-0.5 rounded-l-xs transition-all duration-300 ease-out group-data-[collapsible=icon]:hidden"
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
              onItemClick={onItemClick}
              itemRef={(el) => {
                itemRefs.current[index] = el;
              }}
            />
          );
        })}
      </SidebarMenu>
    </div>
  );
}

const Item = ({
  organizationId,
  item,
  isActive,
  disabled,
  onItemClick,
  itemRef,
}: ItemProps) => {
  const Icon = item.icon;
  const linkDisabled = disabled || item.disabled;
  const itemPath = item.path.replace(':organizationId', organizationId ?? '');
  const { isMobile, setOpen } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      setOpen(false);
    }
    onItemClick?.();
  };

  if (linkDisabled) {
    return (
      <SidebarMenuItem ref={itemRef}>
        <SidebarMenuButton disabled tooltip="Coming Soon">
          <Icon size={16} />
          <span>Coming Soon</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem ref={itemRef}>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
        <Link href={itemPath} onClick={handleClick}>
          <Icon size={16} />
          <span>{item.name}</span>
          {item.badge && (
            <Badge variant={item.badge.variant} className="ml-auto text-xs">
              {item.badge.text}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

type Props = {
  organizationId?: string;
  organization?: { advancedModeEnabled?: boolean } | null;
  onItemClick?: () => void;
};
