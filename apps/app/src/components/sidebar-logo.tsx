import Link from "next/link";

import { cn } from "@trycompai/ui/cn";
import { Icons } from "@trycompai/ui/icons";

export function SidebarLogo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={cn("flex items-center transition-all duration-300")}>
      <Link href="/" suppressHydrationWarning>
        <Icons.Logo
          width={40}
          height={40}
          className={cn("transition-transform duration-300")}
        />
      </Link>
    </div>
  );
}
