import { UserMenu } from '@/app/components/user-menu';
import { Icons } from '@comp/ui/icons';
import { Skeleton } from '@comp/ui/skeleton';
import Link from 'next/link';
import { Suspense } from 'react';

export async function Header() {
  return (
    <header className="border-border bg-background/70 sticky top-0 z-10 w-full border-b backdrop-blur-xl">
      <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Icons.Logo />
          <span className="text-lg font-medium">Comp AI - Employee Portal</span>
        </Link>

        <div className="flex items-center space-x-2">
          <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
