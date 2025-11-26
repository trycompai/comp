'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../utils';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface SecondaryMenuProps {
  items: {
    enabled?: boolean;
    path: string;
    label: string;
    query?: Record<string, string>;
    // We use this to override the active state for a specific item based on the prefix of the id
    activeOverrideIdPrefix?: string;
  }[];
  isChild?: boolean;
  showBackButton?: boolean;
  backButtonHref?: string;
  backButtonLabel?: string;
}

export function SecondaryMenu({
  items,
  isChild,
  showBackButton,
  backButtonHref = '/',
  backButtonLabel = 'Back',
}: SecondaryMenuProps) {
  const pathname = usePathname();

  function isActiveLink(itemPath: string, activeOverrideIdPrefix?: string): boolean {
    // Handle override prefix first
    if (activeOverrideIdPrefix && pathname.includes(activeOverrideIdPrefix)) {
      return true;
    }

    // Exact match
    if (pathname === itemPath) {
      return true;
    }

    // Check if current path starts with item path followed by a slash
    // This prevents false matches like "/dashboard/org/test" matching "/dashboard/org/te"
    if (pathname.startsWith(itemPath + '/')) {
      return true;
    }

    return false;
  }

  // Memoize enabled items to prevent recreation on every render
  const enabledItems = useMemo(() => items.filter((item) => item.enabled !== false), [items]);

  // Calculate active index by finding the most specific (longest) matching path
  const getActiveIndex = () => {
    let bestMatchIndex = -1;
    let bestMatchLength = 0;

    enabledItems.forEach((item, index) => {
      if (isActiveLink(item.path, item.activeOverrideIdPrefix)) {
        // Prefer exact matches over prefix matches
        if (pathname === item.path) {
          bestMatchIndex = index;
          bestMatchLength = item.path.length + 1000; // Ensure exact matches win
        } else if (item.path.length > bestMatchLength) {
          // For prefix matches, prefer the longest matching path
          bestMatchIndex = index;
          bestMatchLength = item.path.length;
        }
      }
    });

    return bestMatchIndex;
  };

  const [activeIndex, setActiveIndex] = useState(getActiveIndex);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverStyle, setHoverStyle] = useState({});
  const [activeStyle, setActiveStyle] = useState({ left: '0px', width: '0px' });
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Update activeIndex when pathname changes
  useEffect(() => {
    const newActiveIndex = getActiveIndex();
    setActiveIndex(newActiveIndex);
  }, [pathname, enabledItems]);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (hoveredElement) {
        const { offsetLeft, offsetWidth } = hoveredElement;
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [hoveredIndex]);

  useEffect(() => {
    if (activeIndex >= 0) {
      const activeElement = tabRefs.current[activeIndex];
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement;
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex >= 0) {
      requestAnimationFrame(() => {
        const activeTabElement = tabRefs.current[activeIndex];
        if (activeTabElement) {
          const { offsetLeft, offsetWidth } = activeTabElement;
          setActiveStyle({
            left: `${offsetLeft}px`,
            width: `${offsetWidth}px`,
          });
        }
      });
    }
  }, [activeIndex]);

  return (
    <nav className={'pb-4 relative z-5 bg-background'}>
      <div className="flex items-center gap-2 overflow-auto p-[1px]">
        {showBackButton && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={backButtonHref}>
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1">{backButtonLabel}</span>
            </Link>
          </Button>
        )}

        <div className="relative mb-0 w-full bg-card rounded-sm pb-2">
          {/* Hover Highlight */}
          <div
            className="bg-muted absolute h-9 rounded-xs transition-all duration-300 ease-out"
            style={{
              ...hoverStyle,
              opacity: hoveredIndex !== null ? 1 : 0,
            }}
          />

          {/* Inactive Tab Underline */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border/50" />

          {/* Active Indicator */}
          {activeIndex >= 0 && (
            <div
              className="bg-primary absolute bottom-0 h-[3px] rounded-t-xs transition-all duration-300 ease-out z-10"
              style={activeStyle}
            />
          )}

          {/* Menu Items */}
          <div className="relative flex items-center">
            {(() => {
              let enabledItemIndex = 0;
              return items.map((item) => {
                const isDisabled = item.enabled === false;

                if (isDisabled) {
                  return (
                    <TooltipProvider key={item.path}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-not-allowed opacity-50"
                            disabled
                          >
                            {item.label}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Coming soon</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                const currentEnabledIndex = enabledItemIndex++;
                const isActive = currentEnabledIndex === activeIndex;

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    ref={(el) => {
                      tabRefs.current[currentEnabledIndex] = el;
                    }}
                    className={cn(
                      'rounded-xs px-3 text-sm transition-colors pt-2 duration-300 select-none',
                      isActive ? '' : 'text-muted-foreground',
                    )}
                    onMouseEnter={() => setHoveredIndex(currentEnabledIndex)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setActiveIndex(currentEnabledIndex)}
                  >
                    {item.label}
                  </Link>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </nav>
  );
}
