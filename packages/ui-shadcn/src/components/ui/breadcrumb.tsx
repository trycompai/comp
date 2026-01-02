import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import * as React from 'react';

import { ArrowRightIcon, ChevronRightIcon, MoreHorizontalIcon, SlashIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface BreadcrumbItemData {
  /** The text label for the breadcrumb item */
  label?: React.ReactNode;
  /** The href for the link. If omitted on the last item, it becomes the current page */
  href?: string;
  /** Whether this item is the current page (auto-detected if last item has no href) */
  isCurrent?: boolean;
  /** Render as ellipsis (collapsed items indicator) */
  isEllipsis?: boolean;
  /** Additional props to pass to the link or page element */
  props?: Record<string, unknown>;
}

type BreadcrumbSeparatorType = 'chevron' | 'slash' | 'arrow';

const separatorIcons: Record<BreadcrumbSeparatorType, React.ReactNode> = {
  chevron: <ChevronRightIcon />,
  slash: <SlashIcon />,
  arrow: <ArrowRightIcon />,
};

interface BreadcrumbProps extends Omit<React.ComponentProps<'nav'>, 'children' | 'className'> {
  /** Simple API: Array of breadcrumb items */
  items?: BreadcrumbItemData[];
  /** Separator style: 'chevron' (default), 'slash', or 'arrow' */
  separator?: BreadcrumbSeparatorType;
  /** Max visible items (including ellipsis). Default: 4. Set to 0 to disable auto-collapse. */
  maxItems?: number;
  /** Number of items to show at the start before ellipsis. Default: 1 */
  itemsBeforeCollapse?: number;
  /** Children for compound component pattern */
  children?: React.ReactNode;
}

interface CollapseResult {
  displayItems: Array<BreadcrumbItemData & { collapsedItems?: BreadcrumbItemData[] }>;
  hasCollapsed: boolean;
}

function collapseItems({
  items,
  maxItems,
  itemsBeforeCollapse,
}: {
  items: BreadcrumbItemData[];
  maxItems: number;
  itemsBeforeCollapse: number;
}): CollapseResult {
  // If maxItems is 0 or items already fit, return as-is
  if (maxItems === 0 || items.length <= maxItems) {
    return { displayItems: items, hasCollapsed: false };
  }

  // Ensure we have at least 1 item before ellipsis
  const before = Math.max(1, Math.min(itemsBeforeCollapse, maxItems - 2));

  // Calculate items after ellipsis: maxItems - before - 1 (for ellipsis)
  const after = maxItems - before - 1;

  // If we can't fit at least 1 after, no point collapsing
  if (after < 1) {
    return { displayItems: items, hasCollapsed: false };
  }

  // If before + after >= items.length, no need to collapse
  if (before + after >= items.length) {
    return { displayItems: items, hasCollapsed: false };
  }

  const startItems = items.slice(0, before);
  const collapsedItems = items.slice(before, items.length - after);
  const endItems = items.slice(items.length - after);

  return {
    displayItems: [...startItems, { isEllipsis: true, collapsedItems }, ...endItems],
    hasCollapsed: true,
  };
}

function Breadcrumb({
  items,
  separator = 'chevron',
  maxItems = 4,
  itemsBeforeCollapse = 1,
  children,
  ...props
}: BreadcrumbProps) {
  // If items prop is provided, render simple API
  if (items && items.length > 0) {
    const separatorIcon = separatorIcons[separator];

    // Auto-collapse if needed
    const { displayItems } = collapseItems({
      items,
      maxItems,
      itemsBeforeCollapse,
    });

    return (
      <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props}>
        <BreadcrumbList>
          {displayItems.map((item, index) => {
            const isLast = index === displayItems.length - 1;
            const isCurrent = item.isCurrent ?? (isLast && !item.href && !item.isEllipsis);
            const collapsedItems = 'collapsedItems' in item ? item.collapsedItems : undefined;

            return (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {item.isEllipsis ? (
                    <BreadcrumbEllipsisMenu collapsedItems={collapsedItems} />
                  ) : isCurrent ? (
                    <BreadcrumbPage {...item.props}>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href} {...item.props}>
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator>{separatorIcon}</BreadcrumbSeparator>}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </nav>
    );
  }

  // Otherwise, render compound component pattern
  return (
    <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props}>
      {children}
    </nav>
  );
}

function BreadcrumbList({ ...props }: Omit<React.ComponentProps<'ol'>, 'className'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className="text-muted-foreground gap-1.5 text-sm sm:gap-2.5 flex flex-wrap items-center break-words"
      {...props}
    />
  );
}

function BreadcrumbItem({ ...props }: Omit<React.ComponentProps<'li'>, 'className'>) {
  return <li data-slot="breadcrumb-item" className="gap-1.5 inline-flex items-center" {...props} />;
}

function BreadcrumbLink({ render, ...props }: Omit<useRender.ComponentProps<'a'>, 'className'>) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>(
      {
        className: 'hover:text-foreground transition-colors',
      },
      props,
    ),
    render,
    state: {
      slot: 'breadcrumb-link',
    },
  });
}

function BreadcrumbPage({ ...props }: Omit<React.ComponentProps<'span'>, 'className'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className="text-foreground font-normal"
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  ...props
}: Omit<React.ComponentProps<'li'>, 'className'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className="[&>svg]:size-3.5"
      {...props}
    >
      {children ?? <ChevronRightIcon />}
    </li>
  );
}

function BreadcrumbEllipsis({ ...props }: Omit<React.ComponentProps<'span'>, 'className'>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className="size-5 [&>svg]:size-4 flex items-center justify-center"
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">More</span>
    </span>
  );
}

function BreadcrumbEllipsisMenu({ collapsedItems }: { collapsedItems?: BreadcrumbItemData[] }) {
  if (!collapsedItems || collapsedItems.length === 0) {
    return <BreadcrumbEllipsis />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger variant="ellipsis" aria-label="Show hidden breadcrumb items">
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {collapsedItems.map((item, index) => (
          <DropdownMenuItem key={index} render={item.href ? <a href={item.href} /> : undefined}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
export type { BreadcrumbItemData, BreadcrumbSeparatorType };
