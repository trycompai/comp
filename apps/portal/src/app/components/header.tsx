import { UserMenu } from '@/app/components/user-menu';
import { Icons } from '@comp/ui/icons';
import { Skeleton } from '@comp/ui/skeleton';
import Link from 'next/link';
import { Suspense } from 'react';

export async function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between py-4">
      <Link href="/">
        <Icons.Logo />
      </Link>

      <div className="flex items-center space-x-2">
        <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
