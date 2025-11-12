import { cn } from '@comp/ui/cn';
import { Icons } from '@comp/ui/icons';
import Link from 'next/link';

export function SidebarLogo({
  isCollapsed,
  organizationId,
}: {
  isCollapsed: boolean;
  organizationId?: string;
}) {
  const href = organizationId ? `/${organizationId}/` : '/';
  return (
    <Link
      href={href}
      suppressHydrationWarning
      className={cn(
        'inline-flex h-7.5 items-center rounded-xs',
        // we are not using px because logo is not a square
        isCollapsed ? 'justify-center px-0.5' : 'justify-start pr-1.5 pl-1',
        'transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-hidden',
      )}
    >
      <Icons.Logo width={28} height={28} className="transition-transform duration-300" />
    </Link>
  );
}
