import { Icons } from '@comp/ui/icons';
import Link from 'next/link';

export function SidebarLogo() {
  return (
    <Link href="/" suppressHydrationWarning className="flex items-center">
      <Icons.Logo width={40} height={40} />
    </Link>
  );
}
