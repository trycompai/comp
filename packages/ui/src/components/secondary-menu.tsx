"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@comp/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "../utils";

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
  backButtonHref = "/",
  backButtonLabel = "Back",
}: SecondaryMenuProps) {
  const pathname = usePathname();

  function getPathSegments(path: string) {
    return path.split("/").filter(Boolean);
  }

  function isActiveLink(
    itemPath: string,
    activeOverrideIdPrefix?: string,
  ): boolean {
    const currentSegments = getPathSegments(pathname);
    const itemSegments = getPathSegments(itemPath);

    const segmentsToCompare = currentSegments.slice(0, 3);

    if (
      activeOverrideIdPrefix &&
      currentSegments.toString().includes(activeOverrideIdPrefix)
    ) {
      return true;
    }

    return (
      segmentsToCompare.length === itemSegments.length &&
      itemSegments.every((segment, i) => segment === segmentsToCompare[i])
    );
  }

  return (
    <nav
      className={cn(isChild ? "py-0 select-none" : "pt-4 select-none")}
      key={pathname}
    >
      <ul
        className={cn(
          "scrollbar-hide flex overflow-auto py-2 text-sm border-b border-border",
          isChild ? "space-x-3" : "space-x-6",
        )}
      >
        {showBackButton && (
          <li>
            <Link
              href={backButtonHref}
              className="flex items-center gap-1 hover:text-foreground/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{backButtonLabel}</span>
            </Link>
          </li>
        )}
        {items.map((item) => {
          const isDisabled = item.enabled === false;

          const itemContent = (
            <span
              className={cn(
                "hover:bg-secondary p-2 border-b-2 font-medium",
                isActiveLink(item.path, item.activeOverrideIdPrefix)
                  ? "border-primary"
                  : "border-transparent",
                isDisabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {item.label}
            </span>
          );

          return (
            <li key={item.path}>
              {isDisabled ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
                    <TooltipContent>
                      <p>Coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Link
                  prefetch
                  href={{
                    pathname: item.path,
                  }}
                >
                  {itemContent}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
