import { UserMenu } from '@/app/components/user-menu';
import { Icons } from '@comp/ui/icons';
import { Skeleton } from '@comp/ui/skeleton';
import Link from 'next/link';
import { Suspense } from 'react';

export async function Header() {
  return (
    <header className="border-border bg-background/70 sticky top-0 z-10 flex items-center justify-between border-b pt-4 pb-2 backdrop-blur-xl backdrop-filter md:bg-transparent md:pb-4 md:backdrop-filter-none">
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
