import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import PageCore from './PageCore.tsx';

interface BreadcrumbDropdownItem {
  label: string;
  href: string;
}

interface BreadcrumbItemType {
  label: string;
  href?: string;
  dropdown?: BreadcrumbDropdownItem[];
  current?: boolean;
}

interface PageLayoutProps {
  children: React.ReactNode;
  breadcrumbs: BreadcrumbItemType[];
  /**
   * Maximum number of visible items before collapsing
   * @default 3
   */
  maxItems?: number;
  maxLabelLength?: number;
  headerRight?: React.ReactNode;
  className?: string;
}

export default function PageWithBreadcrumb({
  children,
  breadcrumbs,
  maxItems = 3,
  maxLabelLength = 40,
  headerRight,
  className,
}: PageLayoutProps) {
  const totalItems = breadcrumbs.length;
  const shouldCollapse = totalItems > maxItems;

  const visibleItems = shouldCollapse
    ? [breadcrumbs[0], ...breadcrumbs.slice(totalItems - (maxItems - 1))]
    : breadcrumbs;

  const hiddenItems = shouldCollapse ? breadcrumbs.slice(1, totalItems - (maxItems - 1)) : [];

  return (
    <PageCore className={className}>
      <div className="mb-2 flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            {visibleItems.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === visibleItems.length - 1;
              const showEllipsis = shouldCollapse && index === 1;

              return (
                <React.Fragment key={item.label}>
                  <BreadcrumbItem>
                    {item.dropdown ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={`flex items-center gap-1 text-sm ${item.current ? 'font-medium' : ''}`}
                        >
                          {item.current ? (
                            <BreadcrumbPage className="inline-flex items-center gap-1">
                              {item.label.length > maxLabelLength
                                ? `${item.label.slice(0, maxLabelLength)}...`
                                : item.label}
                              <ChevronDown className="h-4 w-4" />
                            </BreadcrumbPage>
                          ) : (
                            <>
                              {item.label.length > maxLabelLength
                                ? `${item.label.slice(0, maxLabelLength)}...`
                                : item.label}
                              <ChevronDown className="h-4 w-4" />
                            </>
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-[300px]">
                          {item.dropdown.map((dropdownItem) => (
                            <DropdownMenuItem key={dropdownItem.href} asChild>
                              <Link href={dropdownItem.href}>
                                {dropdownItem.label.length > maxLabelLength
                                  ? `${dropdownItem.label.slice(0, maxLabelLength)}...`
                                  : dropdownItem.label}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : item.current ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={item.href || '#'}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                  {showEllipsis && hiddenItems.length > 0 && (
                    <>
                      <BreadcrumbItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <BreadcrumbEllipsis />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {hiddenItems.map((hiddenItem) => (
                              <DropdownMenuItem key={hiddenItem.label} asChild>
                                <Link href={hiddenItem.href || '#'}>{hiddenItem.label}</Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
        {headerRight}
      </div>
      {children}
    </PageCore>
  );
}
