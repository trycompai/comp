import { cn } from '@comp/ui/cn';
import { Icons } from '@comp/ui/icons';
import Link from 'next/link';

export function SidebarLogo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={cn('flex items-center transition-all duration-300')}>
      <Link href="/" suppressHydrationWarning>
        <Icons.Logo width={40} height={40} className={cn('transition-transform duration-300')} />
      </Link>
    </div>
  );
}
