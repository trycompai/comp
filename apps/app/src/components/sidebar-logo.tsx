import { Icons } from '@comp/ui/icons';
import Link from 'next/link';

export function SidebarLogo() {
  return (
    <div className="flex items-center">
      <Link href="/" suppressHydrationWarning>
        <Icons.Logo width={40} height={40} />
      </Link>
    </div>
  );
}
